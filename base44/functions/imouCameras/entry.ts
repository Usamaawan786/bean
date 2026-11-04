import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Read-only Imou Life integration. Credentials come from app secrets
// IMOU_APP_ID / IMOU_APP_SECRET (optionally IMOU_BASE_URL). Never hard-code them.

// Only the 9 cafe cameras. The personal "Home" camera (B9715BEPCG75BBB) is deliberately excluded.
const CAMERAS = [
  { id: '128FFBKPSFA261A', name: 'Till', zone: 'Counter' },
  { id: '236BCCAPSF95A37', name: 'Indoor Entry', zone: 'Indoor' },
  { id: '236BCCAPSFCDA87', name: 'Indoor Takeaway', zone: 'Indoor' },
  { id: '236BCCAPSF820A1', name: 'Coffee & Bar Station', zone: 'Service' },
  { id: '236BCCAPSF8DC17', name: 'Kitchen 1', zone: 'Kitchen' },
  { id: '236BCCAPSF87FDB', name: 'Kitchen 2', zone: 'Kitchen' },
  { id: '236BCCAPSF593AC', name: 'Small Kitchen', zone: 'Kitchen' },
  { id: '74FD1BFPBVC0ABA', name: 'Outer Takeaway', zone: 'Outdoor' },
  { id: '74FD1BFPBV6E19F', name: 'Outdoor Lawn', zone: 'Outdoor' },
];

// Regional gateways (data center comes from Console → My information) plus the
// legacy global gateway used by apps created on the old easy4ip developer portal.
const BASES = [
  'https://openapi-sg.easy4ip.com',
  'https://openapi-fk.easy4ip.com',
  'https://openapi-or.easy4ip.com',
  'https://openapi.easy4ip.com',
];

function hex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// password = lowercase hex SHA-256(appSecret); sign = Base64(HMAC-SHA256(source, password))
async function makeSign(time: number, nonce: string, appSecret: string) {
  const password = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(appSecret)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`time:${time},nonce:${nonce},appSecret:${appSecret}`));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function call(base: string, path: string, params: Record<string, unknown>, appId: string, appSecret: string) {
  const time = Math.round(Date.now() / 1000);
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const sign = await makeSign(time, nonce, appSecret);
  const res = await fetch(`${base}/openapi/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: { ver: '1.0', appId, sign, time, nonce }, id: crypto.randomUUID(), params }),
  });
  const json = await res.json();
  return json?.result ?? { code: 'HTTP_' + res.status, msg: 'bad response' };
}

async function getSession(appId: string, appSecret: string) {
  const failures: string[] = [];
  for (const base of BASES) {
    try {
      const r = await call(base, 'accessToken', {}, appId, appSecret);
      if (r.code === '0' && r.data?.accessToken) return { base, token: r.data.accessToken as string };
      failures.push(`${base.replace('https://', '').replace('.easy4ip.com', '')}: ${r.code} ${r.msg ?? ''}`.trim());
    } catch (e) {
      failures.push(`${base.replace('https://', '')}: NETWORK ${String(e).slice(0, 60)}`);
    }
  }
  throw new Error(`Imou sign-in failed on every gateway → ${failures.join(' | ')}`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'super_admin', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const appId = Deno.env.get('IMOU_APP_ID');
    const appSecret = Deno.env.get('IMOU_APP_SECRET');
    if (!appId || !appSecret) {
      return Response.json({ error: 'not_configured', message: 'Imou secrets are not set yet (IMOU_APP_ID, IMOU_APP_SECRET).' }, { status: 200 });
    }

    // Guard against the usual paste mistakes (spaces / line breaks / values swapped).
    const looksValid = (v: string) => v.length >= 16 && v.length <= 64 && !/\s/.test(v) && !v.includes('@');
    if (!looksValid(appId) || !looksValid(appSecret) || appId === appSecret) {
      return Response.json({
        error: 'invalid_credential_format',
        message: 'The saved Imou credentials do not look like an AppId + AppSecret pair. Re-copy them from Console → My Apps → App Info (no spaces, no line breaks, each value in its own field).',
      }, { status: 200 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';
    const { base, token } = await getSession(appId, appSecret);

    if (action === 'list') {
      const cameras = await Promise.all(CAMERAS.map(async (c) => {
        try {
          const r = await call(base, 'deviceOnline', { token, deviceId: c.id }, appId, appSecret);
          const online = r.code === '0' && (String(r.data?.onLine) === '1' || r.data?.onLine === true);
          return { ...c, online, error: r.code === '0' ? null : `${r.code} ${r.msg}` };
        } catch (e) {
          return { ...c, online: false, error: String(e) };
        }
      }));
      return Response.json({ cameras });
    }

    if (action === 'snapshot') {
      const cam = CAMERAS.find((c) => c.id === body.deviceId);
      if (!cam) return Response.json({ error: 'Unknown camera' }, { status: 400 });
      const r = await call(base, 'setDeviceSnapEnhanced', { token, deviceId: cam.id, channelId: '0' }, appId, appSecret);
      if (r.code !== '0') return Response.json({ error: `${r.code} ${r.msg}` }, { status: 200 });
      return Response.json({ url: r.data?.url, camera: cam.name });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});