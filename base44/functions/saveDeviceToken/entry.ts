import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    // Log every incoming request for debugging
    console.log('[saveDeviceToken] === INCOMING REQUEST ===');
    console.log('[saveDeviceToken] Method:', req.method);
    console.log('[saveDeviceToken] URL:', req.url);
    console.log('[saveDeviceToken] Origin:', req.headers.get('origin'));
    console.log('[saveDeviceToken] User-Agent:', req.headers.get('user-agent'));
    console.log('[saveDeviceToken] Content-Type:', req.headers.get('content-type'));
    console.log('[saveDeviceToken] Authorization present:', !!req.headers.get('authorization'));

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        console.log('[saveDeviceToken] Responding to OPTIONS preflight');
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    }

    try {
        const base44 = createClientFromRequest(req);

        let rawBody;
        try {
            rawBody = await req.json();
            console.log('[saveDeviceToken] Raw body keys:', Object.keys(rawBody));
        } catch (e) {
            console.error('[saveDeviceToken] Failed to parse JSON body:', e.message);
            return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { token, platform, user_email: bodyEmail } = rawBody;
        console.log('[saveDeviceToken] token present:', !!token);
        console.log('[saveDeviceToken] token preview:', token ? token.substring(0, 30) + '...' : 'MISSING');
        console.log('[saveDeviceToken] platform:', platform);
        console.log('[saveDeviceToken] body user_email:', bodyEmail || 'none');

        if (!token || !platform) {
            console.error('[saveDeviceToken] Missing token or platform');
            return Response.json({ error: 'Missing token or platform' }, { status: 400 });
        }

        let userEmail = null;
        try {
            const user = await base44.auth.me();
            if (user?.email) userEmail = user.email;
            console.log('[saveDeviceToken] Authenticated user:', userEmail || 'none');
        } catch (e) {
            console.log('[saveDeviceToken] Not authenticated, using body email if provided:', bodyEmail || 'none');
        }

        // Fallback: use email from request body if auth failed
        if (!userEmail && bodyEmail) {
            userEmail = bodyEmail;
            console.log('[saveDeviceToken] Using body-provided user_email:', userEmail);
        }

        // Check for existing records with this token
        const existing = await base44.asServiceRole.entities.DeviceToken.filter({ token });
        console.log('[saveDeviceToken] Existing records with this token:', existing.length);

        if (existing.length > 0) {
            for (const record of existing) {
                const updateData = { is_active: true, platform };
                if (userEmail) updateData.user_email = userEmail;
                await base44.asServiceRole.entities.DeviceToken.update(record.id, updateData);
                console.log('[saveDeviceToken] Updated existing record id:', record.id);
            }
        } else {
            const createData = { token, platform, is_active: true };
            if (userEmail) createData.user_email = userEmail;
            const created = await base44.asServiceRole.entities.DeviceToken.create(createData);
            console.log('[saveDeviceToken] Created NEW record id:', created.id, 'for platform:', platform, 'user:', userEmail || 'anonymous');
        }

        if (userEmail) {
            const userTokens = await base44.asServiceRole.entities.DeviceToken.filter({ user_email: userEmail, is_active: true });
            console.log('[saveDeviceToken] User', userEmail, 'now has', userTokens.length, 'active token(s)');
        }

        // Count total active tokens
        const allActive = await base44.asServiceRole.entities.DeviceToken.filter({ is_active: true });
        console.log('[saveDeviceToken] Total active tokens in DB:', allActive.length);

        return Response.json({ success: true, user_email: userEmail, platform }, {
            headers: { 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error) {
        console.error('[saveDeviceToken] FATAL ERROR:', error.message, error.stack);
        return Response.json({ error: error.message }, { 
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }
});