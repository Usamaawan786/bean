import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Banknote, Smartphone, Gift, UtensilsCrossed, ShoppingBag, Percent, TrendingDown } from "lucide-react";

const fmtMoney = (v) => `Rs. ${(v || 0).toLocaleString()}`;

const PAYMENT_ICONS = {
  Cash: Banknote,
  Card: CreditCard,
  "Mobile Payment": Smartphone,
  Complimentary: Gift,
};

const ORDER_LABELS = { dine_in: "Dine In", takeaway: "Takeaway" };
const ORDER_ICONS = { dine_in: UtensilsCrossed, takeaway: ShoppingBag };

function BreakdownRow({ icon: Icon, label, count, revenue, total }) {
  const pct = total > 0 ? (revenue / total) * 100 : 0;
  return (
    <div className="flex items-center justify-between pb-2 border-b border-[#F5EBE8] last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#8B7355]" />
        <span className="text-sm text-[#5C4A3A] font-medium">{label}</span>
        {count != null && <span className="text-xs text-[#C9B8A6]">({count})</span>}
      </div>
      <div className="text-right">
        <div className="font-semibold text-[#5C4A3A] text-sm">{fmtMoney(revenue)}</div>
        <div className="text-xs text-[#8B7355]">{pct.toFixed(1)}%</div>
      </div>
    </div>
  );
}

export default function SalesInsightsCard({ periodLabel, paymentAmounts = {}, orderType = {}, discountStats = {} }) {
  const paymentEntries = Object.entries(paymentAmounts).sort((a, b) => b[1].revenue - a[1].revenue);
  const orderEntries = Object.entries(orderType).sort((a, b) => b[1].revenue - a[1].revenue);
  const totalPaymentRevenue = paymentEntries.reduce((s, [, v]) => s + v.revenue, 0);
  const totalOrderRevenue = orderEntries.reduce((s, [, v]) => s + v.revenue, 0);

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Payment Type */}
      <Card className="border-[#E8DED8]">
        <CardHeader>
          <CardTitle className="text-[#5C4A3A] flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Payment Type · {periodLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentEntries.length === 0 ? (
            <p className="text-center text-[#8B7355] py-6 text-sm">No data</p>
          ) : (
            <>
              {paymentEntries.map(([name, data]) => (
                <BreakdownRow
                  key={name}
                  icon={PAYMENT_ICONS[name] || CreditCard}
                  label={name}
                  count={data.count}
                  revenue={data.revenue}
                  total={totalPaymentRevenue}
                />
              ))}
              <div className="flex items-center justify-between pt-2 border-t-2 border-[#E8DED8]">
                <span className="font-bold text-[#5C4A3A]">Total</span>
                <span className="font-bold text-[#5C4A3A]">{fmtMoney(totalPaymentRevenue)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Order Type */}
      <Card className="border-[#E8DED8]">
        <CardHeader>
          <CardTitle className="text-[#5C4A3A] flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" /> Order Type · {periodLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {orderEntries.length === 0 ? (
            <p className="text-center text-[#8B7355] py-6 text-sm">No data</p>
          ) : (
            <>
              {orderEntries.map(([name, data]) => (
                <BreakdownRow
                  key={name}
                  icon={ORDER_ICONS[name] || ShoppingBag}
                  label={ORDER_LABELS[name] || name}
                  count={data.count}
                  revenue={data.revenue}
                  total={totalOrderRevenue}
                />
              ))}
              <div className="flex items-center justify-between pt-2 border-t-2 border-[#E8DED8]">
                <span className="font-bold text-[#5C4A3A]">Total</span>
                <span className="font-bold text-[#5C4A3A]">{fmtMoney(totalOrderRevenue)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Discount Insights */}
      <Card className="border-[#E8DED8]">
        <CardHeader>
          <CardTitle className="text-[#5C4A3A] flex items-center gap-2">
            <Percent className="h-5 w-5" /> Discount Insights · {periodLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {discountStats && discountStats.totalOriginalSubtotal > 0 ? (
            <>
              <div className="flex items-center justify-between pb-2 border-b border-[#F5EBE8]">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-[#5C4A3A] font-medium">Discount Given</span>
                </div>
                <span className="font-semibold text-red-600 text-sm">{fmtMoney(discountStats.totalDiscountAmount)}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#F5EBE8]">
                <span className="text-sm text-[#8B7355]">Discounted Sales</span>
                <span className="font-semibold text-[#5C4A3A] text-sm">{discountStats.salesWithDiscount}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#F5EBE8]">
                <span className="text-sm text-[#8B7355]">Original Subtotal</span>
                <span className="font-semibold text-[#5C4A3A] text-sm">{fmtMoney(discountStats.totalOriginalSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#F5EBE8]">
                <span className="text-sm text-[#8B7355]">Avg Discount %</span>
                <span className="font-semibold text-[#5C4A3A] text-sm">{discountStats.discountPct.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t-2 border-[#E8DED8]">
                <span className="font-bold text-[#5C4A3A]">Net Revenue</span>
                <span className="font-bold text-[#5C4A3A]">{fmtMoney(discountStats.totalOriginalSubtotal - discountStats.totalDiscountAmount)}</span>
              </div>
            </>
          ) : (
            <p className="text-center text-[#8B7355] py-6 text-sm">No discount data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}