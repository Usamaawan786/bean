import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * importPendingPhotos
 *
 * Takes menu photos that were generated elsewhere (rows in ImageImport with status 'pending'),
 * downloads each one, stores it permanently in the app's file storage, and sets it as the photo of the
 * matching StoreProduct and DeliveryProduct (matched by exact name). Admin / manager only.
 * Only fills items that have NO photo yet, so it can never overwrite an existing photo.
 */
const ALLOWED = ['admin', 'super_admin', 'manager'];
const norm = (s: any) => String(s || '').trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ALLOWED.includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const pending = await sr.ImageImport.filter({ status: 'pending' }, 'created_date', 60);
    const results: any[] = [];

    for (const row of pending || []) {
      try {
        const res = await fetch(row.source_url);
        if (!res.ok) throw new Error(`download failed (${res.status})`);
        const buf = await res.arrayBuffer();
        const file = new File([buf], `${norm(row.product_name).replace(/[^a-z0-9]+/g, '_')}.jpg`, { type: 'image/jpeg' });
        const up = await base44.asServiceRole.integrations.Core.UploadFile({ file });
        const url = up?.file_url;
        if (!url) throw new Error('upload returned no url');

        const stores = await sr.StoreProduct.filter({ name: row.product_name });
        for (const p of stores || []) if (!p.image_url) await sr.StoreProduct.update(p.id, { image_url: url });
        const deliveries = await sr.DeliveryProduct.filter({ name: row.product_name });
        for (const d of deliveries || []) if (!d.image_url) await sr.DeliveryProduct.update(d.id, { image_url: url });

        await sr.ImageImport.update(row.id, { status: 'done', final_url: url, error: '' });
        results.push({ name: row.product_name, ok: true });
      } catch (e: any) {
        await sr.ImageImport.update(row.id, { status: 'failed', error: String(e?.message || e).slice(0, 200) });
        results.push({ name: row.product_name, ok: false, error: String(e?.message || e) });
      }
    }

    return Response.json({ success: true, processed: results.length, results });
  } catch (e: any) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});
