import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  // NEUTRALISED — this legacy function (SDK v0.6 era) did a name-match deduction
  // against the old `Inventory` entity using a plain read-then-write (no $inc),
  // which double-deducts stock when triggered alongside `deductSaleIngredients`.
  // It is intentionally kept as an early-return stub so any lingering automation
  // trigger that still references it no-ops safely. Use `deductSaleIngredients`
  // and `deductMenuRecipe` for all sale-driven stock deduction.
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({ success: true, message: 'Deprecated — use deductSaleIngredients' });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Unexpected error' }, { status: 500 });
  }
});