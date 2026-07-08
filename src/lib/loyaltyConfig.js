// ── Loyalty point conversion — single source of truth ─────────────
// Canonical rate: 1 point per PKR 100 spent.
//
// The backend point-award logic (processBillScan, AdminPOS) reads the LIVE
// value from RewardSettings.pkr_per_point (DB) and only falls back to this
// constant. Keep RewardSettings.pkr_per_point in sync with PKR_PER_POINT.
//
// Update this constant + RewardSettings together to change the rate app-wide.
export const PKR_PER_POINT = 100;

// Points earned for a given PKR spend (matches the backend Math.floor logic).
export const pointsForSpend = (pkr) => Math.floor((pkr || 0) / PKR_PER_POINT);

// Estimated PKR spend required to earn a given number of points.
export const estimateSpendForPoints = (points) => (points || 0) * PKR_PER_POINT;