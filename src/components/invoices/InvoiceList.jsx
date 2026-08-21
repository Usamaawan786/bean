import { Loader2, Copy, Send, FileText, ShoppingBag, Receipt } from "lucide-react";

const STATUS_STYLE = {
  Draft: "bg-amber-100 text-amber-700",
  Submitted: "bg-green-100 text-green-700"
};

function fmtMoney(n) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function InvoiceList({ invoices, itemsByInvoice, onClone, onSubmit, submittingId }) {
  if (!invoices.length) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8DED8] p-10 text-center">
        <FileText className="h-10 w-10 mx-auto mb-3 text-[#C9B8A6]" />
        <p className="font-semibold text-[#5C4A3A]">No invoices yet</p>
        <p className="text-sm text-[#8B7355] mt-1">Create a new purchase or expenditure invoice to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((inv) => {
        const lines = itemsByInvoice[inv.id] || [];
        const isPurchase = inv.type === "PURCHASE_INVOICE";
        const submitting = submittingId === inv.id;
        return (
          <div key={inv.id} className="bg-white rounded-2xl border border-[#E8DED8] overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-[#E8DED8] bg-[#FBF8F5]">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isPurchase ? "bg-[#8B7355]/10 text-[#8B7355]" : "bg-blue-100 text-blue-600"}`}>
                  {isPurchase ? <ShoppingBag className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[#5C4A3A]">{inv.invoice_number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[inv.status] || "bg-gray-100 text-gray-600"}`}>{inv.status}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F5EBE8] text-[#8B7355]">
                      {isPurchase ? "Purchase" : "Expenditure"}
                    </span>
                    {inv.cloned_from && <span className="text-[10px] text-[#C9B8A6]">cloned from {inv.cloned_from}</span>}
                  </div>
                  <p className="text-xs text-[#8B7355] mt-0.5 truncate">
                    {inv.date} · {inv.supplier_name || "—"} · {inv.branch_name || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-bold text-[#5C4A3A]">PKR {fmtMoney(inv.total_amount)}</span>
                <button
                  onClick={() => onClone(inv)}
                  title="Clone / Repeat invoice"
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#E8DED8] text-[#5C4A3A] hover:bg-[#F5EBE8]"
                >
                  <Copy className="h-3.5 w-3.5" /> Clone
                </button>
                {inv.status === "Draft" && (
                  <button
                    onClick={() => onSubmit(inv)}
                    disabled={submitting}
                    title="Submit — post to stock ledger"
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#8B7355] text-white hover:bg-[#6B5744] disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Submit
                  </button>
                )}
              </div>
            </div>

            {lines.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[560px]">
                  <thead className="text-[#C9B8A6]">
                    <tr>
                      <th className="text-left font-medium px-4 py-1.5">Item</th>
                      <th className="text-left font-medium px-2 py-1.5">Unit</th>
                      <th className="text-right font-medium px-2 py-1.5">Qty</th>
                      <th className="text-right font-medium px-2 py-1.5">Unit Cost</th>
                      <th className="text-right font-medium px-4 py-1.5">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((it) => (
                      <tr key={it.id} className="border-t border-[#F0EAE4]">
                        <td className="px-4 py-1.5 text-[#5C4A3A]">{it.item_name}</td>
                        <td className="px-2 py-1.5 text-[#8B7355]">{it.unit || "—"}</td>
                        <td className="px-2 py-1.5 text-right text-[#5C4A3A]">{it.quantity}</td>
                        <td className="px-2 py-1.5 text-right text-[#5C4A3A]">{fmtMoney(it.unit_cost)}</td>
                        <td className="px-4 py-1.5 text-right font-semibold text-[#5C4A3A]">{fmtMoney(it.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}