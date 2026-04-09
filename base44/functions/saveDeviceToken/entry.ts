import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { token, platform } = await req.json();

        if (!token || !platform) {
            return Response.json({ error: 'Missing token or platform' }, { status: 400 });
        }

        let userEmail = null;
        try {
            const user = await base44.auth.me();
            if (user?.email) userEmail = user.email;
        } catch (_) {
            console.log("No authenticated user, saving token anonymously");
        }

        console.log(`[saveDeviceToken] token=${token.substring(0, 20)}... platform=${platform} user=${userEmail || 'anonymous'}`);

        // Find ALL records matching this exact token
        const existing = await base44.asServiceRole.entities.DeviceToken.filter({ token });

        if (existing.length > 0) {
            // Update ALL matching records to ensure at least one is active
            for (const record of existing) {
                const updateData = { is_active: true, platform };
                if (userEmail && !record.user_email) {
                    updateData.user_email = userEmail;
                } else if (userEmail) {
                    updateData.user_email = userEmail;
                }
                await base44.asServiceRole.entities.DeviceToken.update(record.id, updateData);
                console.log(`[saveDeviceToken] Updated existing record id=${record.id}`);
            }
        } else {
            // Create a fresh record
            const createData = { token, platform, is_active: true };
            if (userEmail) createData.user_email = userEmail;
            const created = await base44.asServiceRole.entities.DeviceToken.create(createData);
            console.log(`[saveDeviceToken] Created new record id=${created.id}`);
        }

        // Also update any OTHER tokens for this user to remain active (don't deactivate — multiple devices)
        // Just log how many active tokens this user has
        if (userEmail) {
            const userTokens = await base44.asServiceRole.entities.DeviceToken.filter({ user_email: userEmail, is_active: true });
            console.log(`[saveDeviceToken] User ${userEmail} now has ${userTokens.length} active token(s)`);
        }

        return Response.json({ success: true });

    } catch (error) {
        console.error('[saveDeviceToken] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});