// Categories that go to bar (drinks)
const BAR_CATEGORIES = ["Hot Coffee", "Cold Coffee", "Tea", "Juices", "Smoothies"];

// Counter increments stored in localStorage per session
function getNextOrderNumber() {
  const today = new Date().toDateString();
  const stored = JSON.parse(localStorage.getItem("bean_order_seq") || "{}");
  if (stored.date !== today) {
    localStorage.setItem("bean_order_seq", JSON.stringify({ date: today, seq: 1 }));
    return 1;
  }
  const next = (stored.seq || 0) + 1;
  localStorage.setItem("bean_order_seq", JSON.stringify({ date: today, seq: next }));
  return next;
}

export function buildKitchenOrder({ cart, customerInfo, billNumber, orderType, counter, total, paymentMethod }) {
  const seq = getNextOrderNumber();
  const orderNumber = `#${String(seq).padStart(2, "0")}`;

  const items = cart.map(item => ({
    product_id: item.id,
    product_name: item.name,
    quantity: item.quantity,
    price: item.price,
    category: item.category || "Other",
    notes: item.notes || "",
    station: BAR_CATEGORIES.includes(item.category) ? "bar" : "kitchen",
    status: "pending"
  }));

  const hasKitchenItems = items.some(i => i.station === "kitchen");
  const hasBarItems = items.some(i => i.station === "bar");

  return {
    order_number: orderNumber,
    bill_number: billNumber,
    order_type: orderType,
    counter: counter || "counter_1",
    customer_name: customerInfo?.name || "",
    items,
    kitchen_status: hasKitchenItems ? "pending" : "not_applicable",
    bar_status: hasBarItems ? "pending" : "not_applicable",
    overall_status: "queued",
    priority: orderType === "takeaway" ? 10 : 0,
    total_amount: total,
    payment_method: paymentMethod,
    placed_at: new Date().toISOString(),
  };
}