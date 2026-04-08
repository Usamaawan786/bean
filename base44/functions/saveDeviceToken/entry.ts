import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { token, platform } = await req.json();

        if (!token || !platform) {
            return Response.json({ error: 'Missing token or platform' }, { status: 400 });
        }

        let userEmail = "";
        try {
            const user = await base44.auth.me();
            if (user && user.email) {
                userEmail = user.email;
            }
        } catch (_) {
            // Not authenticated — save token without user email
            console.log("No authenticated user, saving token anonymously");
        }

        // Check if token already exists to avoid duplicates
        const existing = await base44.asServiceRole.entities.DeviceToken.filter({ token });

        if (existing.length > 0) {
            await base44.asServiceRole.entities.DeviceToken.update(existing[0].id, {
                user_email: userEmail || existing[0].user_email,
                is_active: true
            });
            console.log("Updated existing token for:", userEmail);
        } else {
            await base44.asServiceRole.entities.DeviceToken.create({
                token,
                user_email: userEmail,
                platform,
                is_active: true
            });
            console.log("Saved new token for:", userEmail || "anonymous");
        }

        return Response.json({ success: true });

    } catch (error) {
        console.error('Error saving device token:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});