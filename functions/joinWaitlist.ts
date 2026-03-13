import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { full_name, email, referred_by } = await req.json();

        // Validate input
        if (!full_name || !email) {
            return Response.json({ error: 'Name and email are required' }, { status: 400 });
        }

        // Check for duplicate email
        const existingSignups = await base44.asServiceRole.entities.WaitlistSignup.filter({ email });
        if (existingSignups.length > 0) {
            return Response.json({ 
                success: false,
                error: 'You are already registered on the waitlist! Check your email for confirmation.',
                duplicate: true 
            }, { status: 400 });
        }

        // Get client IP address
        const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                        req.headers.get('x-real-ip') || 
                        'unknown';

        // Check for duplicate IP (if IP is known)
        if (clientIP !== 'unknown') {
            const ipSignups = await base44.asServiceRole.entities.WaitlistSignup.filter({ ip_address: clientIP });
            if (ipSignups.length > 0) {
                return Response.json({ 
                    error: 'A signup from this location has already been registered',
                    duplicate: true 
                }, { status: 409 });
            }
        }

        // Generate unique referral code
        const refCode = full_name.split(" ")[0].toUpperCase() + 
            Math.random().toString(36).substring(2, 6).toUpperCase();

        // Get current position using service role
        const signups = await base44.asServiceRole.entities.WaitlistSignup.list();
        const newPosition = signups.length + 1;

        // Create signup using service role (bypasses auth)
        await base44.asServiceRole.entities.WaitlistSignup.create({
            full_name,
            email,
            referral_code: refCode,
            referred_by: referred_by || null,
            position: newPosition,
            ip_address: clientIP
        });

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