import { format } from "date-fns";
import { ShoppingBag, QrCode, Package } from "lucide-react";

export default function PurchasesTab({ sales, orders, redemptions }) {
  const totalScanned = sales.length;
  const totalSpend = sales.reduce((s, x) => s + (x.total_amount || 0), 0);
  const totalPtsFromScans = sales.reduce((s, x) => s + (x.points_awarded || 0), 0);

  return (
    <div className="space-y-4">
      {/* QR Scanned Bills */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
            <QrCode className="h-4 w-4 text-teal-500" /> QR Scanned Bills
          </h4>
          <span className="text-xs bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full font-medium">{totalScanned} scans</span>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-center mb-4">
          <div className="bg-gray-50 rounded-xl p-2">
            <div className="text-base font-bold text-gray-800">{totalScanned}</div>
            <div className="text-xs text-gray-400">Bills</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-2">
            <div className="text-base font-bold text-gray-800">Rs. {totalSpend.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Total Spend</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-2">
            <div className="text-base font-bold text-amber-600">{totalPtsFromScans}</div>
            <div className="text-xs text-gray-400">Pts Earned</div>
          </div>
        </div>

        {sales.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No QR scans yet</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sales.map(sale => (
              <div key={sale.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-gray-700">#{sale.bill_number}</p>
                  <p className="text-xs text-gray-400">
                    {sale.scanned_at ? format(new Date(sale.scanned_at), "MMM d, HH:mm") : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">Rs. {(sale.total_amount || 0).toLocaleString()}</p>
                  {sale.points_awarded > 0 && (
                    <p className="text-xs text-amber-600">+{sale.points_awarded} pts</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Online Orders */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-purple-500" /> Online Orders
          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium ml-auto">{orders.length}</span>
        </h4>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No online orders yet</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {orders.map(order => (
              <div key={order.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-gray-700">#{order.order_number || order.id.slice(-6)}</p>
                  <p className="text-xs text-gray-400">{order.items?.length || 0} items · {order.status}</p>
                  <p className="text-xs text-gray-400">{order.created_date ? format(new Date(order.created_date), "MMM d, HH:mm") : ""}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">Rs. {(order.total_amount || 0).toLocaleString()}</p>
                  {order.points_earned > 0 && (
                    <p className="text-xs text-amber-600">+{order.points_earned} pts</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Redemptions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2 mb-3">
          <ShoppingBag className="h-4 w-4 text-green-500" /> Reward Redemptions
          <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium ml-auto">{redemptions.length}</span>
        </h4>
        {redemptions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No redemptions yet</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {redemptions.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-gray-700">{r.reward_name}</p>
                  <p className="text-xs text-gray-400">{r.created_date ? format(new Date(r.created_date), "MMM d, HH:mm") : ""}</p>
                  <p className="text-xs font-mono text-gray-400">{r.redemption_code}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    r.status === "claimed" ? "bg-green-100 text-green-600" :
                    r.status === "expired" ? "bg-red-100 text-red-600" :
                    "bg-gray-100 text-gray-500"
                  }`}>{r.status}</span>
                  <p className="text-xs text-red-500 mt-1">-{r.points_spent} pts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}