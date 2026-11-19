import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { jsPDF } from 'npm:jspdf@4.0.0';

const PKT = 'Asia/Karachi';

const keyOf = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: PKT, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const fmtDate = (key) => {
  const d = new Date(`${key}T12:00:00+05:00`);
  return new Intl.DateTimeFormat('en-GB', { timeZone: PKT, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(d);
};

const fmtTime = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: PKT, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(iso));

const money = (n) => 'Rs ' + Math.round(Number(n) || 0).toLocaleString('en-PK');

const lineTotal = (it) => (Number(it.price) || 0) * (Number(it.quantity) || 0) * (1 - (Number(it.item_discount_pct) || 0) / 100);

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'super_admin', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const date = body.date || keyOf(new Date(Date.now() - 86400000));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });

    const start = new Date(`${date}T00:00:00+05:00`).toISOString();
    const end = new Date(new Date(start).getTime() + 86400000).toISOString();

    let sales = [];
    let cursor;
    for (let i = 0; i < 20; i++) {
      const page = await base44.asServiceRole.entities.StoreSale.filter(
        { created_date: { $gte: start, $lt: end } },
        cursor ? { sort: 'created_date', limit: 200, cursor } : { sort: 'created_date', limit: 200 }
      );
      const rows = Array.isArray(page) ? page : page?.items || [];
      sales = sales.concat(rows);
      if (!page || Array.isArray(page) || !page.has_more || !page.next_cursor) break;
      cursor = page.next_cursor;
    }
    sales.sort((a, b) => String(a.created_date).localeCompare(String(b.created_date)));

    const total = sales.reduce((s, x) => s + (Number(x.total_amount) || 0), 0);
    const itemCount = sales.reduce((s, x) => s + (x.items || []).reduce((t, i) => t + (Number(i.quantity) || 0), 0), 0);
    const byMethod = {};
    for (const s of sales) {
      const m = s.payment_method || 'Cash';
      if (!byMethod[m]) byMethod[m] = { total: 0, count: 0 };
      byMethod[m].total += Number(s.total_amount) || 0;
      byMethod[m].count += 1;
    }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = 595.28;
    const H = 841.89;
    const M = 40;
    const RIGHT = W - M;
    let y = M;

    const ensure = (h) => {
      if (y + h > H - 54) {
        doc.addPage();
        y = M;
      }
    };

    const wrap = (text, width) => doc.splitTextToSize(String(text || ''), width);

    // ---- header band ----
    doc.setFillColor(92, 74, 58);
    doc.rect(0, 0, W, 96, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.text('BEAN COFFEE', M, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(212, 196, 176);
    doc.text('DAILY SALES REPORT', M, 58);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(fmtDate(date), M, 76);
    doc.setTextColor(212, 196, 176);
    doc.text('All times PKT', RIGHT, 76, { align: 'right' });
    y = 120;

    // ---- summary ----
    doc.setTextColor(92, 74, 58);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL SALES', M, y);
    doc.text('BILLS', 250, y);
    doc.text('ITEMS', 350, y);
    doc.text('AVG BILL', 450, y);
    y += 18;
    doc.setFontSize(15);
    doc.text(money(total), M, y);
    doc.text(String(sales.length), 250, y);
    doc.text(String(Math.round(itemCount)), 350, y);
    doc.text(money(sales.length ? total / sales.length : 0), 450, y);
    y += 14;

    doc.setDrawColor(232, 222, 216);
    doc.setLineWidth(0.8);
    doc.line(M, y, RIGHT, y);
    y += 20;

    // ---- payment breakdown ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(139, 115, 85);
    doc.text('BY PAYMENT METHOD', M, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(92, 74, 58);
    Object.entries(byMethod).forEach(([m, v]) => {
      ensure(16);
      doc.text(`${m}`, M + 6, y);
      doc.text(`${v.count} bill${v.count === 1 ? '' : 's'}`, 260, y);
      doc.text(money(v.total), RIGHT - 6, y, { align: 'right' });
      y += 15;
    });
    y += 10;

    // ---- bill index ----
    ensure(70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(139, 115, 85);
    doc.text('BILL LIST', M, y);
    y += 6;
    doc.setDrawColor(212, 196, 176);
    doc.line(M, y, RIGHT, y);
    y += 14;

    const cols = [M, 130, 200, 350, 430];
    doc.setFontSize(8);
    doc.setTextColor(160, 138, 114);
    doc.text('BILL', cols[0], y);
    doc.text('TIME', cols[1], y);
    doc.text('CUSTOMER', cols[2], y);
    doc.text('PAYMENT', cols[3], y);
    doc.text('ITEMS', cols[4], y);
    doc.text('TOTAL', RIGHT, y, { align: 'right' });
    y += 5;
    doc.line(M, y, RIGHT, y);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(92, 74, 58);
    for (const s of sales) {
      ensure(14);
      const cust = s.customer_name || s.customer_phone || '—';
      const itemQty = (s.items || []).reduce((t, i) => t + (Number(i.quantity) || 0), 0);
      doc.text(String(s.bill_number || '—').slice(0, 16), cols[0], y);
      doc.text(fmtTime(s.created_date), cols[1], y);
      doc.text(String(cust).slice(0, 26), cols[2], y);
      doc.text(String(s.payment_method || 'Cash').slice(0, 13), cols[3], y);
      doc.text(String(itemQty), cols[4], y);
      doc.text(money(s.total_amount), RIGHT, y, { align: 'right' });
      y += 13;
    }

    // ---- bill details ----
    doc.addPage();
    y = M;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(92, 74, 58);
    doc.text('BILL DETAILS', M, y);
    y += 8;
    doc.setDrawColor(212, 196, 176);
    doc.line(M, y, RIGHT, y);
    y += 20;

    for (const s of sales) {
      const lines = s.items || [];
      ensure(40 + lines.length * 13);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(92, 74, 58);
      doc.text(`#${s.bill_number || '—'}`, M, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(139, 115, 85);
      const meta = [
        fmtTime(s.created_date),
        s.payment_method || 'Cash',
        s.order_type === 'dine_in' ? `Dine-in · Table ${s.table_number || '-'}` : 'Takeaway',
        s.cashier_name || s.cashier_email || '',
      ].filter(Boolean).join(' · ');
      doc.text(meta.slice(0, 110), M + 90, y);
      doc.text(money(s.total_amount), RIGHT, y, { align: 'right' });
      y += 4;
      doc.setDrawColor(240, 234, 228);
      doc.line(M, y, RIGHT, y);
      y += 12;

      doc.setFontSize(8.5);
      doc.setTextColor(92, 74, 58);
      for (const it of lines) {
        ensure(14);
        const nameLines = wrap(it.product_name || 'Item', 300);
        const qty = Number(it.quantity) || 0;
        const price = Number(it.price) || 0;
        const disc = Number(it.item_discount_pct) || 0;
        doc.text(nameLines[0], M + 8, y);
        doc.setTextColor(139, 115, 85);
        doc.text(`${qty} × ${money(price)}${disc ? ` (${disc}% off)` : ''}`, 360, y);
        doc.setTextColor(92, 74, 58);
        doc.text(money(lineTotal(it)), RIGHT, y, { align: 'right' });
        y += 12;
        for (let k = 1; k < nameLines.length; k++) {
          ensure(12);
          doc.text(nameLines[k], M + 8, y);
          y += 12;
        }
      }

      ensure(14);
      doc.setFontSize(8);
      doc.setTextColor(139, 115, 85);
      const parts = [`Subtotal ${money(s.subtotal)}`];
      if (Number(s.discount_amount) > 0) parts.push(`Discount -${money(s.discount_amount)}`);
      if (Number(s.tax) > 0) parts.push(`GST ${money(s.tax)}`);
      parts.push(`Total ${money(s.total_amount)}`);
      doc.text(parts.join('   |   '), RIGHT, y, { align: 'right' });
      y += 22;
    }

    // ---- footer on every page ----
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(160, 138, 114);
      doc.text('Bean Coffee · Daily Sales Report · amounts in PKR, GST included', M, H - 28);
      doc.text(`Page ${p} of ${pages}`, RIGHT, H - 28, { align: 'right' });
    }

    const bytes = doc.output('arraybuffer');
    const file = new File([bytes], `Bean_Sales_Report_${date}.pdf`, { type: 'application/pdf' });
    const uploaded = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
    const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: uploaded.file_uri,
      expires_in: 3600,
    });

    return Response.json({
      file_url: signed?.signed_url,
      file_name: `Bean_Sales_Report_${date}.pdf`,
      date,
      bills: sales.length,
      items: Math.round(itemCount),
      total,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}