import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { full_name, email, phone, referred_by } = await req.json();

        if (!full_name || !email) {
            return Response.json({ error: 'Name and email are required' }, { status: 400 });
        }

        const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                        req.headers.get('x-real-ip') || 
                        'unknown';

        const refCode = full_name.split(" ")[0].toUpperCase() + 
            Math.random().toString(36).substring(2, 6).toUpperCase();

        const refLink = `https://beancoffee.co/waitlist?ref=${refCode}`;

        // Use record count as position — avoids relying on potentially corrupted position values
        const allSignups = await base44.asServiceRole.entities.WaitlistSignup.list('created_date', 10000);
        const allArr = Array.isArray(allSignups) ? allSignups : [];
        const newPosition = allArr.length + 1;

        await base44.asServiceRole.entities.WaitlistSignup.create({
            full_name,
            email,
            phone: phone || null,
            referral_code: refCode,
            referral_link: refLink,
            referred_by: referred_by || null,
            position: newPosition,
            ip_address: clientIP,
            eba_status: "None"
        });

        // Return immediately — fire background tasks without awaiting
        const nameParts = full_name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';
        const ghlWebhookUrl = "https://services.leadconnectorhq.com/hooks/gj8OBCLmVBdkG2uJwiTN/webhook-trigger/fe044896-846d-465d-8078-0f9eeb44bcb7";

        // Normalize phone to +92 format
        let normalizedPhone = phone || '';
        if (normalizedPhone.startsWith('0')) {
            normalizedPhone = '+92' + normalizedPhone.slice(1);
        } else if (normalizedPhone.startsWith('92') && !normalizedPhone.startsWith('+')) {
            normalizedPhone = '+' + normalizedPhone;
        }

        // Fire and forget — don't block the response
        Promise.all([
            referred_by
                ? base44.asServiceRole.functions.invoke('checkAndPromoteEBA', { referral_code: referred_by }).catch(e => console.error('EBA check failed:', e))
                : Promise.resolve(),
            base44.asServiceRole.functions.invoke('sendWaitlistWelcomeEmail', { full_name, email, referral_code: refCode }).catch(e => console.error('Welcome email failed:', e)),
            fetch(ghlWebhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName, lastName, email, phone: normalizedPhone, position: newPosition, referralCode: refCode, referralLink: refLink }),
            }).catch(e => console.error('GHL webhook failed:', e)),
        ]);

        return Response.json({
            success: true,
            position: newPosition,
            referralCode: refCode
        });
    } catch (error) {
        console.error('Waitlist signup error:', error);
        return Response.json({ error: 'Failed to join waitlist' }, { status: 500 });
    }
});