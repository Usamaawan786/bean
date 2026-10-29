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
    customer_name: paymentMethod === "Foodpanda"
      ? (customerInfo?.name ? `Foodpanda — ${customerInfo.name}` : "Foodpanda")
      : (customerInfo?.name || ""),
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
    // Re-read the freshest copy right before appending, so anything the kitchen
    // marked done since the ticket was resumed is never overwritten.
    let latest = existingOrder;
    try {
      const fresh = await base44.entities.KitchenOrder.filter({ id: existingOrder.id });
      if (fresh && fresh[0]) latest = fresh[0];
    } catch (e) { /* fall back to the in-memory copy */ }

    const addedAt = new Date().toISOString();
    const stamped = entries.map(e => ({ ...e, added_at: addedAt }));
    const updatedItems = [...(latest.items || []), ...stamped];
    const hasKitchen = updatedItems.some(i => i.station === "kitchen");
    const hasBar = updatedItems.some(i => i.station === "bar");
    // Only reopen a station if it actually has unfinished work.
    const kitchenPending = updatedItems.some(i => i.station === "kitchen" && i.status !== "done");
    const barPending = updatedItems.some(i => i.station === "bar" && i.status !== "done");
    const patch = {
      items: updatedItems,
      kitchen_status: !hasKitchen ? "not_applicable" : kitchenPending ? "pending" : "done",
      bar_status: !hasBar ? "not_applicable" : barPending ? "pending" : "done",
      overall_status: "queued",
      items_added_at: addedAt,
      total_amount: updatedItems.reduce((s, i) => s + i.price * i.quantity, 0)
    };
    try {
      await base44.entities.KitchenOrder.update(latest.id, patch);
    } catch (err) {
      // One automatic retry before surfacing the failure to the caller.
      await base44.entities.KitchenOrder.update(latest.id, patch);
    }
    return { ...latest, ...patch };
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
    items: entries.map(e => ({ ...e, added_at: new Date().toISOString() })),
    kitchen_status: hasKitchen ? "pending" : "not_applicable",
    bar_status: hasBar ? "pending" : "not_applicable",
    overall_status: "queued",
    priority: orderType === "takeaway" ? 10 : 0,
    total_amount: entries.reduce((s, i) => s + i.price * i.quantity, 0),
    placed_at: new Date().toISOString(),
    items_added_at: new Date().toISOString(),
  });
}