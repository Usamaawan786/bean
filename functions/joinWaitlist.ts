import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const full_name = body.full_name;
        const email = body.email?.toLowerCase().trim();
        const referred_by = body.referred_by;

        if (!full_name || !email) {
            return Response.json({ error: 'Name and email are required' }, { status: 400 });
        }

        const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                        req.headers.get('x-real-ip') || 
                        'unknown';

        // Check for duplicate email
        const existing = await base44.asServiceRole.entities.WaitlistSignup.filter({ email });
        if (existing.length > 0) {
            return Response.json({
                success: true,
                position: existing[0].position,
                referralCode: existing[0].referral_code,
                alreadyRegistered: true
            });
        }

        // Generate unique referral code
        const refCode = full_name.split(" ")[0].toUpperCase() + 
            Math.random().toString(36).substring(2, 6).toUpperCase();

        const refLink = `https://bean.base44.app/waitlist?referred_by=${refCode}`;

        // Get position by counting existing signups (limit to 1 field to save CPU)
        const allSignups = await base44.asServiceRole.entities.WaitlistSignup.filter({});
        const newPosition = allSignups.length + 1;

        // Create the signup record
        await base44.asServiceRole.entities.WaitlistSignup.create({
            full_name,
            email,
            referral_code: refCode,
            referral_link: refLink,
            referred_by: referred_by || null,
            position: newPosition,
            ip_address: clientIP,
            eba_status: "None"
        });

        // Fire off async side effects — don't await them to save CPU time
        const sideEffects = [];

        if (referred_by) {
            sideEffects.push(
                base44.asServiceRole.functions.invoke('checkAndPromoteEBA', { referral_code: referred_by })
                    .catch(e => console.error('EBA check failed:', e))
            );
        }

        sideEffects.push(
            base44.asServiceRole.functions.invoke('sendWaitlistWelcomeEmail', { full_name, email })
                .catch(e => console.error('Welcome email failed:', e))
        );

        // GHL webhook
        const nameParts = full_name.split(' ');
        sideEffects.push(
            fetch("https://services.leadconnectorhq.com/hooks/gj8OBCLmVBdkG2uJwiTN/webhook-trigger/fe044896-846d-465d-8078-0f9eeb44bcb7", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: nameParts[0],
                    lastName: nameParts.slice(1).join(' ') || '',
                    email,
                    position: newPosition,
                    referralCode: refCode,
                    referralLink: refLink
                }),
            }).catch(e => console.error("GHL webhook failed:", e))
        );

        await Promise.all(sideEffects);

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