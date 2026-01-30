# BEAN Coffee - Security Configuration Guide

## 🔒 Entity Access Control Setup

### Admin-Only Entities (Restrict to Admin Role)
These entities contain sensitive business data and should only be accessible by staff with admin role.

**Set these to "Admin role required" for ALL operations (Create, Read, Update, Delete):**

1. **BusinessTask** - Internal business tasks and ideas
2. **Inventory** - Stock levels and inventory management  
3. **StockAdjustment** - Inventory change records
4. **Expense** - Financial expenses and receipts
5. **StoreSale** - POS transaction records and sales data

---

### Public/User-Accessible Entities
These entities need to be accessible by regular customers.

**Product** - Public (customers browse products)
**StoreProduct** - Public (customers see in-store menu)
**Reward** - Public (customers view available rewards)
**FlashDrop** - Public (customers see flash drop events)
**CommunityPost** - Public with moderation
**Comment** - Public with moderation
**GiftCard** - Public (customers can purchase/redeem)

---

### User-Scoped Entities (created_by filter)
These entities are public for create/read but users only see their own records via `created_by` email filter.

**Customer** - Users see only their profile
**Order** - Users see only their orders
**Redemption** - Users see only their redemptions
**Wallet** - Users see only their wallet
**WalletTransaction** - Users see only their transactions
**Activity** - Users see only their activity
**PersonalizedOffer** - Users see only their offers

---

## 📋 Security Checklist

- [ ] Set BusinessTask to Admin-only (all operations)
- [ ] Set Inventory to Admin-only (all operations)
- [ ] Set StockAdjustment to Admin-only (all operations)
- [ ] Set Expense to Admin-only (all operations)
- [ ] Set StoreSale to Admin-only (all operations)
- [ ] Verify Product/StoreProduct are public (read)
- [ ] Verify Reward/FlashDrop are public (read)
- [ ] Test that regular users cannot access admin data
- [ ] Test that admins can access all data

---

## 🎯 How to Apply

1. Go to Base44 Dashboard
2. Navigate to **Security** tab
3. For each admin-only entity listed above:
   - Click on the entity name
   - Set **all operations** (Create, Read, Update, Delete) to require **Admin role**
4. Save changes
5. Test with a non-admin account to verify access is blocked

---

## 🚨 Important Notes

- User entity has built-in security (users see only their own record)
- Admin users with `admin_role: founder` have full access
- Regular customers (role: user) should never see operational data
- Always test security changes with a test user account before going live