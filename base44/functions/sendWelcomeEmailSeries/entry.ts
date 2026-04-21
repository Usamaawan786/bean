import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

function email1_Welcome(name, referralCode) {
  const firstName = name?.split(" ")[0] || "Coffee Lover";
  const referralLink = `https://app.base44.com/apps/68199bfdc48db7be39b05fcd/?ref=${referralCode}`;

  return {
    subject: "☕ Welcome to Bean — your rewards journey starts now",
    body: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to Bean</title></head>
<body style="margin:0;padding:0;background:#F5F1ED;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1ED;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- HERO -->
      <tr><td style="background:linear-gradient(135deg,#5C4A3A 0%,#8B7355 100%);border-radius:24px 24px 0 0;padding:60px 40px 50px;text-align:center;">
        <div style="width:80px;height:80px;background:rgba(255,255,255,0.15);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:40px;">☕</span>
        </div>
        <h1 style="margin:0 0 12px;color:#fff;font-size:32px;font-weight:800;letter-spacing:-0.5px;">Welcome to Bean, ${firstName}!</h1>
        <p style="margin:0;color:rgba(255,255,255,0.80);font-size:17px;line-height:1.6;">You've just joined Islamabad's most rewarding coffee community.</p>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background:#fff;padding:40px;">
        <p style="margin:0 0 20px;color:#5C4A3A;font-size:16px;line-height:1.7;">Hey ${firstName} ☀️</p>
        <p style="margin:0 0 20px;color:#6B5744;font-size:15px;line-height:1.7;">
          We're beyond excited to have you here. Bean isn't just another café — it's a community built around great coffee, real rewards, and moments worth sharing. And you're officially part of it now.
        </p>
        <p style="margin:0 0 30px;color:#6B5744;font-size:15px;line-height:1.7;">
          Here's a taste of what's waiting for you inside:
        </p>

        <!-- Feature grid -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr>
            <td width="48%" style="background:#F9F5F1;border-radius:16px;padding:24px;vertical-align:top;">
              <div style="font-size:28px;margin-bottom:10px;">⭐</div>
              <div style="font-weight:700;color:#5C4A3A;font-size:15px;margin-bottom:6px;">Earn Points</div>
              <div style="color:#8B7355;font-size:13px;line-height:1.6;">Every visit & scan earns you Bean Points. The more you drink, the more you earn.</div>
            </td>
            <td width="4%"></td>
            <td width="48%" style="background:#F9F5F1;border-radius:16px;padding:24px;vertical-align:top;">
              <div style="font-size:28px;margin-bottom:10px;">🎁</div>
              <div style="font-weight:700;color:#5C4A3A;font-size:15px;margin-bottom:6px;">Free Rewards</div>
              <div style="color:#8B7355;font-size:13px;line-height:1.6;">Redeem points for free drinks, merchandise, and exclusive experiences.</div>
            </td>
          </tr>
          <tr><td colspan="3" style="height:12px;"></td></tr>
          <tr>
            <td width="48%" style="background:#F9F5F1;border-radius:16px;padding:24px;vertical-align:top;">
              <div style="font-size:28px;margin-bottom:10px;">⚡</div>
              <div style="font-weight:700;color:#5C4A3A;font-size:15px;margin-bottom:6px;">Flash Drops</div>
              <div style="color:#8B7355;font-size:13px;line-height:1.6;">Surprise limited-time freebies at Bean. First come, first served — only for members.</div>
            </td>
            <td width="4%"></td>
            <td width="48%" style="background:#F9F5F1;border-radius:16px;padding:24px;vertical-align:top;">
              <div style="font-size:28px;margin-bottom:10px;">👥</div>
              <div style="font-weight:700;color:#5C4A3A;font-size:15px;margin-bottom:6px;">Community</div>
              <div style="color:#8B7355;font-size:13px;line-height:1.6;">Share your coffee moments, discover tips, and connect with fellow Bean lovers.</div>
            </td>
          </tr>
        </table>

        <!-- Bonus callout -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr><td style="background:linear-gradient(135deg,#FFF8F0,#FFF0DC);border:2px solid #F5DFB5;border-radius:16px;padding:24px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🎉</div>
            <div style="font-weight:800;color:#5C4A3A;font-size:18px;margin-bottom:6px;">You already have 50 points!</div>
            <div style="color:#8B7355;font-size:14px;line-height:1.6;">We've credited your account with a welcome bonus. Head to the Rewards tab to see what you can redeem.</div>
          </td></tr>
        </table>

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr><td align="center">
            <a href="https://app.base44.com/apps/68199bfdc48db7be39b05fcd/" style="display:inline-block;background:linear-gradient(135deg,#5C4A3A,#8B7355);color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:16px 40px;border-radius:50px;letter-spacing:0.3px;">
              Open Bean App →
            </a>
          </td></tr>
        </table>

        <!-- Referral teaser -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="background:#F0EBE5;border-radius:14px;padding:20px 24px;">
            <p style="margin:0 0 6px;font-weight:700;color:#5C4A3A;font-size:14px;">💌 Know someone who loves coffee?</p>
            <p style="margin:0;color:#8B7355;font-size:13px;line-height:1.6;">Your personal referral link: <a href="${referralLink}" style="color:#5C4A3A;font-weight:700;">${referralLink}</a><br>Share it — when they join and spend Rs. 2,000, you both earn 25 bonus points.</p>
          </td></tr>
        </table>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#5C4A3A;border-radius:0 0 24px 24px;padding:30px 40px;text-align:center;">
        <p style="margin:0 0 8px;color:rgba(255,255,255,0.9);font-size:14px;font-weight:600;">Bean Coffee, Islamabad</p>
        <p style="margin:0;color:rgba(255,255,255,0.50);font-size:12px;">You're receiving this because you signed up for Bean Rewards.<br>Questions? Just reply to this email.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
  };
}

function email2_HowItWorks(name) {
  const firstName = name?.split(" ")[0] || "Coffee Lover";
  return {
    subject: "⭐ Here's exactly how to earn (and spend) your Bean Points",
    body: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>How Bean Rewards Works</title></head>
<body style="margin:0;padding:0;background:#F5F1ED;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1ED;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- HERO -->
      <tr><td style="background:linear-gradient(135deg,#1a1612 0%,#5C4A3A 100%);border-radius:24px 24px 0 0;padding:50px 40px;text-align:center;">
        <div style="font-size:52px;margin-bottom:16px;">🗺️</div>
        <h1 style="margin:0 0 12px;color:#fff;font-size:28px;font-weight:800;">Your Points Playbook</h1>
        <p style="margin:0;color:rgba(255,255,255,0.75);font-size:15px;">Everything you need to know to maximise your rewards at Bean.</p>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background:#fff;padding:40px;">
        <p style="margin:0 0 24px;color:#5C4A3A;font-size:15px;line-height:1.7;">Hey ${firstName} — your journey with Bean has begun. Let's make sure you're earning every point you deserve. Here's the complete guide:</p>

        <!-- Step 1 -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          <tr>
            <td width="52" valign="top">
              <div style="width:44px;height:44px;background:linear-gradient(135deg,#8B7355,#5C4A3A);border-radius:12px;text-align:center;line-height:44px;color:#fff;font-weight:800;font-size:18px;">1</div>
            </td>
            <td style="padding-left:16px;vertical-align:top;">
              <div style="font-weight:700;color:#5C4A3A;font-size:15px;margin-bottom:4px;">Visit Bean & get your bill</div>
              <div style="color:#8B7355;font-size:13px;line-height:1.6;">Order your favourite drink or food. Pay as usual at the counter.</div>
            </td>
          </tr>
        </table>

        <!-- Step 2 -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          <tr>
            <td width="52" valign="top">
              <div style="width:44px;height:44px;background:linear-gradient(135deg,#8B7355,#5C4A3A);border-radius:12px;text-align:center;line-height:44px;color:#fff;font-weight:800;font-size:18px;">2</div>
            </td>
            <td style="padding-left:16px;vertical-align:top;">
              <div style="font-weight:700;color:#5C4A3A;font-size:15px;margin-bottom:4px;">Scan the QR code on your receipt</div>
              <div style="color:#8B7355;font-size:13px;line-height:1.6;">Open Bean app → tap the QR icon on the home screen → scan the QR on your bill. Points are added instantly.</div>
            </td>
          </tr>
        </table>

        <!-- Step 3 -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr>
            <td width="52" valign="top">
              <div style="width:44px;height:44px;background:linear-gradient(135deg,#8B7355,#5C4A3A);border-radius:12px;text-align:center;line-height:44px;color:#fff;font-weight:800;font-size:18px;">3</div>
            </td>
            <td style="padding-left:16px;vertical-align:top;">
              <div style="font-weight:700;color:#5C4A3A;font-size:15px;margin-bottom:4px;">Redeem for free rewards</div>
              <div style="color:#8B7355;font-size:13px;line-height:1.6;">Head to the Rewards tab → pick a reward → show the code to staff. Done!</div>
            </td>
          </tr>
        </table>

        <!-- Points breakdown -->
        <div style="font-weight:700;color:#5C4A3A;font-size:16px;margin-bottom:16px;">💡 How points are calculated</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:28px;">
          <tr style="background:#5C4A3A;">
            <td style="padding:12px 16px;color:#fff;font-weight:600;font-size:13px;border-radius:10px 0 0 0;">Action</td>
            <td style="padding:12px 16px;color:#fff;font-weight:600;font-size:13px;">Points</td>
            <td style="padding:12px 16px;color:#fff;font-weight:600;font-size:13px;border-radius:0 10px 0 0;">When?</td>
          </tr>
          <tr style="background:#FAF7F4;">
            <td style="padding:12px 16px;color:#5C4A3A;font-size:13px;border-bottom:1px solid #EDE8E3;">Scan a bill</td>
            <td style="padding:12px 16px;color:#8B7355;font-weight:700;font-size:13px;border-bottom:1px solid #EDE8E3;">1 pt / Rs. 10 spent</td>
            <td style="padding:12px 16px;color:#8B7355;font-size:13px;border-bottom:1px solid #EDE8E3;">Immediately</td>
          </tr>
          <tr style="background:#fff;">
            <td style="padding:12px 16px;color:#5C4A3A;font-size:13px;border-bottom:1px solid #EDE8E3;">Refer a friend</td>
            <td style="padding:12px 16px;color:#8B7355;font-weight:700;font-size:13px;border-bottom:1px solid #EDE8E3;">+25 pts each</td>
            <td style="padding:12px 16px;color:#8B7355;font-size:13px;border-bottom:1px solid #EDE8E3;">When they spend Rs. 2K</td>
          </tr>
          <tr style="background:#FAF7F4;">
            <td style="padding:12px 16px;color:#5C4A3A;font-size:13px;border-bottom:1px solid #EDE8E3;">Claim a Flash Drop</td>
            <td style="padding:12px 16px;color:#8B7355;font-weight:700;font-size:13px;border-bottom:1px solid #EDE8E3;">+25 pts</td>
            <td style="padding:12px 16px;color:#8B7355;font-size:13px;border-bottom:1px solid #EDE8E3;">On every claim</td>
          </tr>
          <tr style="background:#fff;">
            <td style="padding:12px 16px;color:#5C4A3A;font-size:13px;">Welcome bonus</td>
            <td style="padding:12px 16px;color:#8B7355;font-weight:700;font-size:13px;">50 pts</td>
            <td style="padding:12px 16px;color:#8B7355;font-size:13px;">Already done ✅</td>
          </tr>
        </table>

        <!-- Tiers -->
        <div style="font-weight:700;color:#5C4A3A;font-size:16px;margin-bottom:16px;">🏅 Loyalty Tiers — unlock bigger perks</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr>
            <td width="25%" style="background:#F5EBE0;border-radius:12px;padding:16px 12px;text-align:center;">
              <div style="font-size:22px;">🥉</div>
              <div style="font-weight:700;color:#92651A;font-size:13px;">Bronze</div>
              <div style="color:#8B7355;font-size:11px;margin-top:4px;">0–499 pts</div>
            </td>
            <td width="2%"></td>
            <td width="25%" style="background:#F0F0F0;border-radius:12px;padding:16px 12px;text-align:center;">
              <div style="font-size:22px;">🥈</div>
              <div style="font-weight:700;color:#707070;font-size:13px;">Silver</div>
              <div style="color:#8B7355;font-size:11px;margin-top:4px;">500–999 pts</div>
            </td>
            <td width="2%"></td>
            <td width="25%" style="background:#FFFAE0;border-radius:12px;padding:16px 12px;text-align:center;">
              <div style="font-size:22px;">🥇</div>
              <div style="font-weight:700;color:#B8860B;font-size:13px;">Gold</div>
              <div style="color:#8B7355;font-size:11px;margin-top:4px;">1000–1999 pts</div>
            </td>
            <td width="2%"></td>
            <td width="25%" style="background:#F5E8FF;border-radius:12px;padding:16px 12px;text-align:center;">
              <div style="font-size:22px;">💎</div>
              <div style="font-weight:700;color:#7B2FBE;font-size:13px;">Platinum</div>
              <div style="color:#8B7355;font-size:11px;margin-top:4px;">2000+ pts</div>
            </td>
          </tr>
        </table>

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="https://app.base44.com/apps/68199bfdc48db7be39b05fcd/" style="display:inline-block;background:linear-gradient(135deg,#5C4A3A,#8B7355);color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:16px 40px;border-radius:50px;">
              Start Earning Now ☕
            </a>
          </td></tr>
        </table>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#5C4A3A;border-radius:0 0 24px 24px;padding:30px 40px;text-align:center;">
        <p style="margin:0 0 6px;color:rgba(255,255,255,0.9);font-size:14px;font-weight:600;">Bean Coffee, Islamabad</p>
        <p style="margin:0;color:rgba(255,255,255,0.50);font-size:12px;">Reply to this email anytime — we love hearing from our community.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
  };
}

function email3_FlashDrops(name, referralCode) {
  const firstName = name?.split(" ")[0] || "Coffee Lover";
  const referralLink = `https://app.base44.com/apps/68199bfdc48db7be39b05fcd/?ref=${referralCode}`;
  return {
    subject: "⚡ The secret Bean feature most members miss (don't be one of them)",
    body: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Flash Drops & Referrals</title></head>
<body style="margin:0;padding:0;background:#F5F1ED;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1ED;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- HERO -->
      <tr><td style="background:linear-gradient(135deg,#B45309 0%,#D97706 60%,#F59E0B 100%);border-radius:24px 24px 0 0;padding:50px 40px;text-align:center;">
        <div style="font-size:56px;margin-bottom:16px;">⚡</div>
        <h1 style="margin:0 0 12px;color:#fff;font-size:28px;font-weight:800;">Flash Drops: The Member-Only Superpower</h1>
        <p style="margin:0;color:rgba(255,255,255,0.85);font-size:15px;">Surprise freebies, zero cost — but only if you're fast enough.</p>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background:#fff;padding:40px;">
        <p style="margin:0 0 20px;color:#5C4A3A;font-size:15px;line-height:1.7;">Hey ${firstName},</p>
        <p style="margin:0 0 20px;color:#6B5744;font-size:15px;line-height:1.7;">
          Flash Drops are our way of surprising Bean members with <strong>completely free items</strong> — a cold brew, a pastry, a limited merch drop — no points needed, no catch. Just show up and claim it.
        </p>

        <!-- How it works -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8ED;border:2px solid #F5DFB5;border-radius:18px;padding:24px;margin-bottom:28px;">
          <tr><td>
            <div style="font-weight:800;color:#B45309;font-size:16px;margin-bottom:16px;">How Flash Drops work:</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:14px;vertical-align:top;">
                  <span style="font-size:20px;">🔔</span>
                  <span style="color:#5C4A3A;font-size:14px;line-height:1.6;margin-left:10px;"><strong>We push a notification</strong> — you get an alert the moment a drop goes live.</span>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:14px;vertical-align:top;">
                  <span style="font-size:20px;">📱</span>
                  <span style="color:#5C4A3A;font-size:14px;line-height:1.6;margin-left:10px;"><strong>Open the app</strong> → Flash Drops tab → tap Claim. You get a unique QR code.</span>
                </td>
              </tr>
              <tr>
                <td style="vertical-align:top;">
                  <span style="font-size:20px;">☕</span>
                  <span style="color:#5C4A3A;font-size:14px;line-height:1.6;margin-left:10px;"><strong>Show the QR to staff</strong> at Bean and collect your free item. That's literally it.</span>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>

        <p style="margin:0 0 28px;color:#6B5744;font-size:14px;line-height:1.7;font-style:italic;text-align:center;border-left:3px solid #D4C4B0;padding-left:16px;">
          "I got a free Cold Brew on my second visit just from a Flash Drop. I didn't even expect it!" — a Bean member 😄
        </p>

        <!-- Pro tip -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#EEF6FF;border-radius:16px;padding:20px 24px;margin-bottom:28px;">
          <tr><td>
            <div style="font-weight:700;color:#1D4ED8;font-size:14px;margin-bottom:6px;">💡 Pro Tip: Enable Push Notifications</div>
            <div style="color:#3B82F6;font-size:13px;line-height:1.6;">Flash Drops sell out in minutes. Enable push notifications in the Bean app so you never miss one. Go to Profile → Notifications → Allow.</div>
          </td></tr>
        </table>

        <!-- Divider -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr><td style="border-top:2px dashed #E8DED8;"></td></tr>
        </table>

        <!-- Referral section -->
        <div style="font-weight:800;color:#5C4A3A;font-size:20px;margin-bottom:8px;">👥 Invite friends. Earn together.</div>
        <p style="margin:0 0 20px;color:#6B5744;font-size:14px;line-height:1.7;">
          Every friend you refer is worth <strong>25 points for you</strong> — and 25 for them — once they've spent Rs. 2,000 at Bean. No limit on how many friends you can refer.
        </p>

        <!-- Referral card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#5C4A3A,#8B7355);border-radius:18px;padding:24px;margin-bottom:28px;">
          <tr><td style="text-align:center;">
            <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-bottom:8px;">Your Personal Referral Link</div>
            <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:12px 16px;margin-bottom:16px;">
              <a href="${referralLink}" style="color:#F5DFB5;font-size:13px;font-weight:700;text-decoration:none;word-break:break-all;">${referralLink}</a>
            </div>
            <div style="color:rgba(255,255,255,0.80);font-size:13px;line-height:1.6;">Share this link anywhere. When friends sign up through it, you're automatically credited when they hit the spend milestone.</div>
          </td></tr>
        </table>

        <!-- Final CTA -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="https://app.base44.com/apps/68199bfdc48db7be39b05fcd/" style="display:inline-block;background:linear-gradient(135deg,#B45309,#D97706);color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:16px 40px;border-radius:50px;margin-bottom:12px;">
              Check Active Flash Drops ⚡
            </a>
            <br>
            <div style="color:#8B7355;font-size:12px;margin-top:8px;">One might be live right now 👀</div>
          </td></tr>
        </table>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#5C4A3A;border-radius:0 0 24px 24px;padding:30px 40px;text-align:center;">
        <p style="margin:0 0 6px;color:rgba(255,255,255,0.9);font-size:14px;font-weight:600;">Bean Coffee, Islamabad</p>
        <p style="margin:0;color:rgba(255,255,255,0.50);font-size:12px;">You're receiving this as a new Bean Rewards member.<br>Questions? Just reply — we actually read every email.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
  };
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both direct call and entity automation payload
    let user_email = body.user_email;
    let email_number = body.email_number;

    // Entity automation payload format: { event, data, old_data }
    if (body.event && body.data) {
      const customerData = body.data;
      user_email = customerData.user_email || customerData.created_by;
      email_number = body.email_number || 1;
    }

    if (!user_email || !email_number) {
      return Response.json({ error: "user_email and email_number are required" }, { status: 400 });
    }

    // Fetch the customer record
    const customers = await base44.asServiceRole.entities.Customer.filter({ user_email });
    const customer = customers[0] || body.data;
    const name = customer?.display_name || user_email.split("@")[0];
    const referralCode = customer?.referral_code || "";

    let emailContent;
    if (email_number === 1) {
      emailContent = email1_Welcome(name, referralCode);
    } else if (email_number === 2) {
      emailContent = email2_HowItWorks(name);
    } else if (email_number === 3) {
      emailContent = email3_FlashDrops(name, referralCode);
    } else {
      return Response.json({ error: "Invalid email_number (1, 2, or 3)" }, { status: 400 });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user_email,
      subject: emailContent.subject,
      body: emailContent.body,
      from_name: "Bean Coffee",
    });

    console.log(`Welcome email #${email_number} sent to ${user_email}`);
    return Response.json({ success: true, email_number, recipient: user_email });

  } catch (error) {
    console.error("Error sending welcome email:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});