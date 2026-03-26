import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function should be called by automation or admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all customers
    const customers = await base44.asServiceRole.entities.Customer.list();
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Get sales history
    const sales = await base44.asServiceRole.entities.StoreSale.list('-created_date', 1000);
    
    // Get available products
    const products = await base44.asServiceRole.entities.StoreProduct.filter({ is_available: true });
    
    const offersGenerated = [];
    
    // Generate offers for each user
    for (const customer of customers.slice(0, 20)) { // Limit to 20 users per run to avoid timeouts
      const userInfo = allUsers.find(u => u.email === customer.created_by);
      if (!userInfo) continue;
      
      // Get user's purchase history
      const userSales = sales.filter(s => 
        s.customer_phone === userInfo.phone || 
        s.customer_name?.toLowerCase() === userInfo.full_name?.toLowerCase()
      ).slice(0, 10);
      
      const purchasedProducts = userSales.flatMap(s => s.items?.map(i => i.product_name) || []);
      
      // Deactivate old offers
      const oldOffers = await base44.asServiceRole.entities.PersonalizedOffer.filter({ 
        user_email: userInfo.email 
      });
      for (const oldOffer of oldOffers) {
        if (new Date(oldOffer.expiry_date) < new Date() || oldOffer.is_redeemed) {
          await base44.asServiceRole.entities.PersonalizedOffer.update(oldOffer.id, {
            is_active: false
          });
        }
      }
      
      // Use AI to generate personalized offers
      const prompt = `You are an AI connoisseur for BEAN Coffee creating ONE premium, personalized recommendation.

User Profile:
- Name: ${userInfo.full_name}
- Loyalty Tier: ${customer.tier}
- Points Balance: ${customer.points_balance}
- Purchase History: ${purchasedProducts.length > 0 ? purchasedProducts.join(', ') : 'New customer - no history'}

Available Products:
${products.map(p => `${p.name} (${p.category}) - Rs. ${p.price}`).join('\n')}

BRAND GUIDELINES - CRITICAL:
- We are PREMIUM like Luckin/Starbucks, NOT a discount brand
- Focus on DISCOVERY and TASTE, not savings
- Frame as "handpicked for you" / "perfectly matched" / "next to try"
- Avoid cheap discount language - if discount, call it "early access" or "VIP tasting"

Generate ONE SINGLE premium offer. Priority order:
1st Priority: RECOMMENDATION - Suggest something new they'd love based on taste profile
2nd Priority: CHALLENGE - Engage them ("Try 3 cold brews this week")
3rd Priority: BONUS_POINTS - Reward on specific premium product
4th Priority: Only if high-tier customer, offer exclusive early access (not "discount")

Return ONLY this JSON structure (single object, not array):
{
  "offer_type": "recommendation" (preferred) | "challenge" | "bonus_points" | "free_item",
  "title": "Elegant, premium title (e.g., 'Your Next Favorite Awaits')",
  "description": "Sophisticated copy focusing on taste/experience, not price (e.g., 'Based on your love for rich espressos, our new Single Origin Ethiopian would perfectly complement your palate')",
  "product_name": "Specific product name from the list",
  "discount_percentage": 0 (avoid discounts unless VIP early access, max 15%),
  "points_bonus": 30-50 if bonus_points type,
  "ai_reasoning": "Brief insight into the pairing logic"
}

Make it feel EXCLUSIVE, THOUGHTFUL, and PREMIUM - like a personal barista recommendation.`;

      try {
        const offer = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              offer_type: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              product_name: { type: "string" },
              discount_percentage: { type: "number" },
              points_bonus: { type: "number" },
              ai_reasoning: { type: "string" }
            }
          }
        });

        const offers = [offer];
        
        // Create offers in database
        for (const offer of offers) {
          const expiryDate = new Date();
          expiryDate.setHours(23, 59, 59, 999); // Expires end of today
          
          const createdOffer = await base44.asServiceRole.entities.PersonalizedOffer.create({
            user_email: userInfo.email,
            offer_type: offer.offer_type,
            title: offer.title,
            description: offer.description,
            product_name: offer.product_name,
            discount_percentage: offer.discount_percentage || 0,
            points_bonus: offer.points_bonus || 0,
            expiry_date: expiryDate.toISOString(),
            is_active: true,
            is_redeemed: false,
            ai_reasoning: offer.ai_reasoning
          });
          
          offersGenerated.push({
            user: userInfo.email,
            offer: createdOffer.title
          });
        }
      } catch (error) {
        console.error(`Error generating offers for ${userInfo.email}:`, error);
      }
    }

    return Response.json({
      success: true,
      message: `Generated ${offersGenerated.length} personalized offers`,
      offers: offersGenerated
    });

  } catch (error) {
    console.error('Error in generatePersonalizedOffers:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});