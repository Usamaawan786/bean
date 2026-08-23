import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Verifies a staff member's one-time access code against the latest unconsumed,
// non-expired challenge for their email. Hashes the submitted code and compares
// to the stored hash. Limits to 5 attempts per challenge before invalidating it.

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['cashier', 'manager', 'admin', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { code } = await req.json();
    if (!code) return Response.json({ ok: false, error: 'Code is required' }, { status: 400 });

    const challenges = await base44.asServiceRole.entities.Staff2FAChallenge.filter(
      { user_email: user.email, consumed: false },
      '-created_date', 10
    );
    const now = Date.now();
    const valid = challenges.find(c => new Date(c.expires_at).getTime() >= now);
    if (!valid) {
      return Response.json({ ok: false, error: 'No valid code. Please request a new one.' }, { status: 400 });
    }

    const hash = await sha256(String(code));
    const attempts = (valid.attempts || 0) + 1;

    if (hash === valid.code_hash) {
      await base44.asServiceRole.entities.Staff2FAChallenge.update(valid.id, { consumed: true, attempts });
      return Response.json({ ok: true });
    }

    if (attempts >= 5) {
      await base44.asServiceRole.entities.Staff2FAChallenge.update(valid.id, { consumed: true, attempts });
      return Response.json({ ok: false, error: 'Too many attempts. Please request a new code.' }, { status: 400 });
    }
    await base44.asServiceRole.entities.Staff2FAChallenge.update(valid.id, { attempts });
    return Response.json({ ok: false, error: `Incorrect code. ${5 - attempts} attempt(s) left.` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}