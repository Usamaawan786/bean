import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Receipt, Tag, Clock, TrendingUp } from "lucide-react";

const fmtPKT = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: "Asia/Karachi",
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true
    });
  } catch { return new Date(iso).toLocaleString(); }
};

const OFFER_TYPE_LABEL = {
  discount: "Discount",
  bonus_points: "Bonus Points",
  free_item: "Free Item",
  challenge: "Challenge",
  recommendation: "Recommendation"
};

export default function ProfileDetailPanel({ customerEmail, favoriteItem, segment }) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [offer, setOffer] = useState(null);
  const [itemStats, setItemStats] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [salePage, offerPage] = await Promise.all([
          base44.entities.StoreSale.filter(
            { scanned_by: customerEmail },
            { sort: "-scanned_at", limit: 12, fields: ["scanned_at", "items", "total_amount", "bill_number", "order_type"] }
          ),
          base44.entities.PersonalizedOffer.filter(
            { user_email: customerEmail, is_active: true },
            { sort: "-created_date", limit: 1 }
          )
        ]);
        if (!active) return;
        const sales = salePage.items || salePage || [];
        setOrders(sales);

        // aggregate item frequency across loaded history
        const freq = {};
        for (const s of sales) {
          for (const it of (s.items || [])) {
            if (!it.product_name) continue;
            const key = it.product_name;
            freq[key] = (freq[key] || 0) + (it.quantity || 1);
          }
        }
        setItemStats(Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5));

        const offers = offerPage.items || offerPage || [];
        setOffer(offers[0] || null);
      } catch (e) {
        console.error("profile load failed", e);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [customerEmail]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  const totalSpend = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  return (
    <div className="mt-3 border-t border-[#E8DED8] pt-4 space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#F5EBE8] rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-[#5C4A3A]">{orders.length}</p>
          <p className="text-[10px] text-[#8B7355] uppercase tracking-wide">Scanned Bills</p>
        </div>
        <div className="bg-[#F5EBE8] rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-[#5C4A3A]">Rs {totalSpend.toLocaleString()}</p>
          <p className="text-[10px] text-[#8B7355] uppercase tracking-wide">Spend (recent)</p>
        </div>
        <div className="bg-[#F5EBE8] rounded-xl p-2.5 text-center">
          <p className="text-sm font-bold text-[#5C4A3A] truncate px-1">{favoriteItem || "—"}</p>
          <p className="text-[10px] text-[#8B7355] uppercase tracking-wide">Top Item</p>
        </div>
      </div>

      {/* Highlighted offer */}
      <div>
        <p className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-2 flex items-center gap-1">
          <Tag className="h-3.5 w-3.5" /> Highlighted Offer
        </p>
        {offer ? (
          <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-fuchsia-600 text-white px-2 py-0.5 rounded-full font-medium">
                {OFFER_TYPE_LABEL[offer.offer_type] || offer.offer_type}
              </span>
              {offer.product_name && <span className="text-xs text-[#5C4A3A] font-medium">☕ {offer.product_name}</span>}
            </div>
            <p className="text-sm font-semibold text-[#5C4A3A]">{offer.title}</p>
            <p className="text-xs text-[#8B7355]">{offer.description}</p>
            {offer.discount_percentage > 0 && <p className="text-xs text-fuchsia-700 font-medium mt-1">{offer.discount_percentage}% off</p>}
            {offer.points_bonus > 0 && <p className="text-xs text-fuchsia-700 font-medium mt-1">+{offer.points_bonus} bonus points</p>}
            {offer.expiry_date && <p className="text-[10px] text-[#C9B8A6] mt-1">Expires {fmtPKT(offer.expiry_date)}</p>}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#E8DED8] bg-[#F9F6F3] p-3">
            <p className="text-sm text-[#8B7355]">
              {favoriteItem
                ? `No active offer. Their favorite is ${favoriteItem} — a great anchor for this push.`
                : "No active offer and no scanned-item history yet."}
            </p>
          </div>
        )}
      </div>

      {/* Top items frequency */}
      {itemStats.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-2 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> Top Items
          </p>
          <div className="flex flex-wrap gap-1.5">
            {itemStats.map(([name, cnt]) => (
              <span key={name} className="text-xs bg-[#F5EBE8] text-[#5C4A3A] px-2.5 py-1 rounded-full">
                {name} <span className="text-[#C9B8A6]">×{cnt}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Order history */}
      <div>
        <p className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-2 flex items-center gap-1">
          <Receipt className="h-3.5 w-3.5" /> Order History
        </p>
        {orders.length === 0 ? (
          <p className="text-xs text-[#C9B8A6]">No scanned bills on record.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
            {orders.map((o, i) => (
              <div key={o.id || i} className="rounded-xl bg-white border border-[#E8DED8] p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#8B7355] flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {fmtPKT(o.scanned_at)}
                  </span>
                  <span className="text-xs font-semibold text-[#5C4A3A]">Rs {(o.total_amount || 0).toLocaleString()}</span>
                </div>
                <p className="text-xs text-[#5C4A3A]">
                  {(o.items || []).map(it => `${it.product_name}${it.quantity > 1 ? ` ×${it.quantity}` : ""}`).join(" · ") || "—"}
                </p>
                {o.bill_number && <p className="text-[10px] text-[#C9B8A6] mt-0.5">{o.bill_number}{o.order_type ? ` · ${o.order_type}` : ""}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}