import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Issues a 6-digit one-time staff access code for the logged-in staff member.
// The code is emailed to the user and stored only as a SHA-256 hash with a
// 5-minute expiry. Any previous unconsumed challenge for the user is invalidated.

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
    if (!user.email) return Response.json({ error: 'No email on user account' }, { status: 400 });

    // Invalidate previous unconsumed challenges for this user
    const old = await base44.asServiceRole.entities.Staff2FAChallenge.filter(
      { user_email: user.email, consumed: false }
    );
    for (const c of old) {
      await base44.asServiceRole.entities.Staff2FAChallenge.update(c.id, { consumed: true });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.Staff2FAChallenge.create({
      user_email: user.email,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts: 0,
      consumed: false
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: 'Your Bean Staff Portal access code',
      body: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:420px;margin:0 auto;padding:24px;background:#F5F1ED;border-radius:16px">
        <div style="text-align:center;margin-bottom:16px;font-weight:bold;color:#5C4A3A;font-size:18px">BEAN · Staff Portal</div>
        <p style="color:#5C4A3A;font-size:15px;line-height:1.5">Your one-time staff access code is:</p>
        <p style="font-size:36px;font-weight:700;letter-spacing:8px;text-align:center;color:#8B7355;background:#fff;border-radius:12px;padding:16px;margin:12px 0">${code}</p>
        <p style="color:#8B7355;font-size:13px;line-height:1.5">This code expires in 5 minutes. If you didn't request it, you can safely ignore this email.</p>
      </div>`
    });

    return Response.json({ success: true, expires_at: expiresAt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}