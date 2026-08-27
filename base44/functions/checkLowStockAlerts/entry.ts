import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Scans every InventoryItem for stock at or below its minimum par level and
// pings admins/managers via email + in-app notification only. Mobile push is
// intentionally NOT used here — the shared sendPushNotification path can
// broadcast to unintended devices, which previously leaked an alert to a
// customer. Email + in-app notifications are per-recipient and RLS-locked.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin/manager only — the scheduled automation runs with an admin/service
    // context; manual calls require a manager+ role. Blocks anonymous callers.
    const user = await base44.auth.me();
    if (!user || !['admin', 'super_admin', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Pull every ingredient (paginate to be safe).
    let items = await base44.asServiceRole.entities.InventoryItem.list('-created_date', 500);
    let cursor = items.length === 500 ? 500 : 0;
    while (cursor > 0) {
      const next = await base44.asServiceRole.entities.InventoryItem.list('-created_date', 500, cursor);
      items = items.concat(next);
      cursor = next.length === 500 ? cursor + 500 : 0;
    }

    // Low stock = par level is set and current stock has fallen to/below it.
    const low = items
      .filter(i => {
        const par = Number(i.min_par_level_base_qty) || 0;
        const cur = Number(i.current_stock_base_qty) || 0;
        return par > 0 && cur <= par;
      })
      .sort((a, b) => (Number(a.current_stock_base_qty) || 0) - (Number(b.current_stock_base_qty) || 0));

    if (low.length === 0) {
      console.log(`Low-stock check: all ${items.length} ingredients above par.`);
      return Response.json({ alertCount: 0, checked: items.length, message: 'All ingredients above par' });
    }

    const shown = low.slice(0, 30);
    const lines = shown.map(i =>
      `• ${i.name}${i.sku ? ` (${i.sku})` : ''} — ${Number(i.current_stock_base_qty) || 0} ${i.base_unit} left (par: ${i.min_par_level_base_qty} ${i.base_unit})`
    );
    if (low.length > 30) lines.push(`...and ${low.length - 30} more.`);
    const summary = lines.join('\n');

    const subject = `⚠️ Low Stock Alert — ${low.length} ingredient${low.length === 1 ? '' : 's'} below par`;
    const body = `The following ingredients have fallen to or below their minimum par level and need procurement before peak hours:\n\n${summary}\n\nReview and reorder from the Inventory Hub.`;

    // Recipients: every admin / super_admin / manager (procurement roles).
    const users = await base44.asServiceRole.entities.User.list();
    const recipients = users.filter(u =>
      ['admin', 'super_admin', 'manager'].includes(u.role) && u.email
    );
    const recipientEmails = recipients.map(u => u.email);

    // 1) Email each recipient.
    for (const email of recipientEmails) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject,
          body,
        });
      } catch (e) {
        console.error(`Low-stock email to ${email} failed:`, e.message);
      }
    }

    // 2) In-app notification center (so it's reviewable later).
    for (const email of recipientEmails) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          to_email: email,
          from_email: 'inventory@bean.app',
          from_name: 'Inventory Alerts',
          type: 'announcement',
          title: subject,
          message: body,
          deep_link: '/inventory-hub',
        });
      } catch (e) {
        console.error(`Low-stock in-app notification for ${email} failed:`, e.message);
      }
    }

    console.log(`Low-stock alert sent to ${recipientEmails.length} recipient(s) for ${low.length} item(s).`);
    return Response.json({
      alertCount: low.length,
      checked: items.length,
      recipients: recipientEmails.length,
      items: low.map(i => ({
        name: i.name,
        current: Number(i.current_stock_base_qty) || 0,
        par: i.min_par_level_base_qty,
        unit: i.base_unit,
      })),
    });
  } catch (error) {
    console.error('checkLowStockAlerts error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});