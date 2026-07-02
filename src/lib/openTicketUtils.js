// Helpers for the open-ticket (persistent tab) POS workflow.

export function generateTicketNumber() {
  return "T-" + Date.now().toString().slice(-6);
}

// Aggregate append-only OpenTicketItem rows (excluding voided) into cart-shaped items.
export function aggregateItemsToCart(items, products = []) {
  const map = {};
  items.filter(i => i.status !== "Voided").forEach(i => {
    if (!map[i.product_id]) {
      const prod = products.find(p => p.id === i.product_id);
      map[i.product_id] = {
        id: i.product_id,
        name: i.product_name,
        price: i.price,
        quantity: 0,
        category: prod?.category || "Other"
      };
    }
    map[i.product_id].quantity += i.quantity;
  });
  return Object.values(map).filter(i => i.quantity > 0);
}

// Compare current cart against the last-saved snapshot to find what changed.
export function diffCartAgainstBaseline(cart, baseline) {
  const baselineMap = {};
  baseline.forEach(b => { baselineMap[b.id] = b.quantity; });
  const cartMap = {};
  cart.forEach(c => { cartMap[c.id] = c.quantity; });

  const increases = [];
  cart.forEach(c => {
    const baseQty = baselineMap[c.id] || 0;
    if (c.quantity > baseQty) {
      increases.push({ ...c, quantity: c.quantity - baseQty });
    }
  });

  const decreases = [];
  baseline.forEach(b => {
    const curQty = cartMap[b.id] || 0;
    if (curQty < b.quantity) {
      decreases.push({ id: b.id, quantity: b.quantity - curQty });
    }
  });

  return { increases, decreases };
}