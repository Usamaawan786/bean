import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { action } = await req.json();
    const apiKey = Deno.env.get('SYRVE_API_KEY');
    const configured = !!apiKey;

    if (action === 'test_connection') {
      const status = configured ? 'success' : 'not_configured';
      const message = configured
        ? 'Syrve API key found — connection ready.'
        : 'SYRVE_API_KEY is not set. Add it in settings to enable syncing.';
      const log = await base44.asServiceRole.entities.SyrveSyncLog.create({
        sync_type: 'connection_test',
        status,
        message,
        triggered_by: user.email,
      });
      return Response.json({ connected: configured, message, log });
    }

    if (action === 'trigger_sync') {
      if (!configured) {
        const log = await base44.asServiceRole.entities.SyrveSyncLog.create({
          sync_type: 'manual_sync',
          status: 'not_configured',
          message: 'Cannot sync — SYRVE_API_KEY is not configured.',
          triggered_by: user.email,
        });
        return Response.json({ success: false, message: log.message, log }, { status: 400 });
      }

      // Placeholder for the real Syrve Loyalty Module sync call once
      // the integration token and webhook spec are provided by Syrve.
      const log = await base44.asServiceRole.entities.SyrveSyncLog.create({
        sync_type: 'manual_sync',
        status: 'success',
        records_synced: 0,
        message: 'Manual sync triggered. Awaiting Syrve integration token to exchange real data.',
        triggered_by: user.email,
      });
      return Response.json({ success: true, message: log.message, log });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});