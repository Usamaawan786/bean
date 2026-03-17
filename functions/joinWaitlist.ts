import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { full_name, referred_by } = await req.json();
        const rawEmail = (await req.json().catch(() => ({}))).email;
        // Re-parse properly
        const body = await new Response(req.body).json().catch(() => ({}));
        // Already parsed above, use destructuring from body
        const parsedBody = await req.clone().json();
        const normalizedEmail = parsedBody.email?.toLowerCase().trim();
        const parsedFullName = parsedBody.full_name;
        const parsedReferredBy = parsedBody.referred_by;

        // Validate input
        if (!parsedFullName || !normalizedEmail) {
            return Response.json({ error: 'Name and email are required' }, { status: 400 });
        }

        // Get client IP address
        const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                        req.headers.get('x-real-ip') || 
                        'unknown';

        // Check for duplicate email FIRST
        const existing = await base44.asServiceRole.entities.WaitlistSignup.filter({ email: normalizedEmail });
        if (existing.length > 0) {
            return Response.json({
                success: true,
                position: existing[0].position,
                referralCode: existing[0].referral_code,
                alreadyRegistered: true
            });
        }

        const email = normalizedEmail;
        const full_name = parsedFullName;
        const referred_by_code = parsedReferredBy;

        // Generate unique referral code
        const refCode = full_name.split(" ")[0].toUpperCase() + 
            Math.random().toString(36).substring(2, 6).toUpperCase();

        // Generate complete referral link
        const refLink = `https://bean.base44.app/waitlist?referred_by=${refCode}`;

        // Get current position using service role
        const signups = await base44.asServiceRole.entities.WaitlistSignup.list();
        const newPosition = signups.length + 1;

        // Create signup using service role (bypasses auth)
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

        // Check if referrer should be promoted to EBA
        if (referred_by) {
            try {
                await base44.asServiceRole.functions.invoke('checkAndPromoteEBA', {
                    referral_code: referred_by
                });
            } catch (ebaError) {
                console.error('EBA check failed:', ebaError);
                // Don't fail the signup if EBA check fails
            }
        }

        // Send welcome email
        try {
            await base44.asServiceRole.functions.invoke('sendWaitlistWelcomeEmail', {
                full_name,
                email
            });
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail the signup if email fails
        }

        // Send lead data to GoHighLevel webhook
        try {
            const ghlWebhookUrl = "https://services.leadconnectorhq.com/hooks/gj8OBCLmVBdkG2uJwiTN/webhook-trigger/fe044896-846d-465d-8078-0f9eeb44bcb7";
            
            const nameParts = full_name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || '';

            await fetch(ghlWebhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    position: newPosition,
                    referralCode: refCode,
                    referralLink: `https://bean.base44.app/waitlist?referred_by=${refCode}`
                }),
            });
            console.log("Successfully sent lead data to GoHighLevel webhook.");
        } catch (ghlError) {
            console.error("Error sending data to GHL webhook:", ghlError);
            // Don't fail the signup if GHL webhook fails
        }

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