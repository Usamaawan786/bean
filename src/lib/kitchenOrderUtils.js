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

// Sends newly-added open-ticket items to the KDS. Creates the KitchenOrder on the
// first save, and appends items (never overwriting existing item statuses) on later saves.
export async function syncTicketKitchenOrder({ base44, ticketNumber, deltaItems, products, orderType, counter, customerName, existingOrder }) {
  if (!deltaItems || deltaItems.length === 0) return existingOrder || null;

  const entries = deltaItems.map(item => {
    const prod = products?.find(p => p.id === item.id);
    const category = prod?.category || item.category || "Other";
    return {
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      price: item.price,
      category,
      notes: "",
      station: BAR_CATEGORIES.includes(category) ? "bar" : "kitchen",
      status: "pending"
    };
  });

  if (existingOrder) {
    const updatedItems = [...(existingOrder.items || []), ...entries];
    const hasKitchen = updatedItems.some(i => i.station === "kitchen");
    const hasBar = updatedItems.some(i => i.station === "bar");
    await base44.entities.KitchenOrder.update(existingOrder.id, {
      items: updatedItems,
      kitchen_status: hasKitchen ? "pending" : "not_applicable",
      bar_status: hasBar ? "pending" : "not_applicable",
      overall_status: "queued",
      total_amount: updatedItems.reduce((s, i) => s + i.price * i.quantity, 0)
    });
    return { ...existingOrder, items: updatedItems };
  }

  const seq = getNextOrderNumber();
  const orderNumber = `#${String(seq).padStart(2, "0")}`;
  const hasKitchen = entries.some(i => i.station === "kitchen");
  const hasBar = entries.some(i => i.station === "bar");

  return await base44.entities.KitchenOrder.create({
    order_number: orderNumber,
    bill_number: ticketNumber,
    order_type: orderType,
    counter: counter || "counter_1",
    customer_name: customerName || "",
    items: entries,
    kitchen_status: hasKitchen ? "pending" : "not_applicable",
    bar_status: hasBar ? "pending" : "not_applicable",
    overall_status: "queued",
    priority: orderType === "takeaway" ? 10 : 0,
    total_amount: entries.reduce((s, i) => s + i.price * i.quantity, 0),
    placed_at: new Date().toISOString(),
  });
}