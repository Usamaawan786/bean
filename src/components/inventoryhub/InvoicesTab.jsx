import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import InvoiceFormModal from "@/components/invoices/InvoiceFormModal";
import InvoiceList from "@/components/invoices/InvoiceList";

export default function InvoicesTab() {
  const [invoices, setInvoices] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cloneFrom, setCloneFrom] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [submittingId, setSubmittingId] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [invList, itemList, invItems] = await Promise.all([
        base44.entities.Invoice.list("-created_date", 200),
        base44.entities.InvoiceItem.list("-created_date", 500),
        base44.entities.InventoryItem.list("-created_date", 500)
      ]);
      setInvoices(invList);
      setAllItems(itemList);
      setInventoryItems(invItems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const itemsByInvoice = useMemo(() => {
    const map = {};
    allItems.forEach((it) => { (map[it.invoice_id] ||= []).push(it); });
    return map;
  }, [allItems]);

  const filtered = useMemo(
    () => invoices.filter((i) =>
      (statusFilter === "all" || i.status === statusFilter) &&
      (typeFilter === "all" || i.type === typeFilter)
    ),
    [invoices, statusFilter, typeFilter]
  );

  const openNew = () => { setCloneFrom(null); setModalOpen(true); };
  const handleClone = (inv) => { setCloneFrom({ ...inv, items: itemsByInvoice[inv.id] || [] }); setModalOpen(true); };

  const handleSubmit = async (inv) => {
    setSubmittingId(inv.id);
    try {
      const res = await base44.functions.invoke("submitInvoice", { invoice_id: inv.id });
      const updated = res.data?.stock_updated || 0;
      const msg = updated ? `Submitted — stock updated for ${updated} item${updated > 1 ? "s" : ""}.` : "Submitted.";
      window.sonner?.toast?.success?.(msg) || console.log(msg);
      await loadAll();
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || "Failed to submit invoice";
      window.sonner?.toast?.error?.(msg) || console.error(msg);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleSaved = async (_data, submitted) => {
    await loadAll();
    const msg = submitted ? "Invoice saved & submitted." : "Draft invoice saved.";
    window.sonner?.toast?.success?.(msg) || console.log(msg);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-lg border border-[#E8DED8] bg-white px-2 text-sm text-[#5C4A3A]">
            <option value="all">All status</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 rounded-lg border border-[#E8DED8] bg-white px-2 text-sm text-[#5C4A3A]">
            <option value="all">All types</option>
            <option value="PURCHASE_INVOICE">Purchase</option>
            <option value="EXPENDITURE_INVOICE">Expenditure</option>
          </select>
        </div>
        <Button onClick={openNew} className="bg-[#8B7355] hover:bg-[#6B5744] text-white">
          <Plus className="h-4 w-4 mr-1" /> New Invoice
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#8B7355]">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading invoices…
        </div>
      ) : (
        <InvoiceList
          invoices={filtered}
          itemsByInvoice={itemsByInvoice}
          onClone={handleClone}
          onSubmit={handleSubmit}
          submittingId={submittingId}
        />
      )}

      <InvoiceFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        inventoryItems={inventoryItems}
        cloneFrom={cloneFrom}
      />
    </div>
  );
}