import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function sendWhatsApp(phone, message) {
  const apiKey = Deno.env.get('GHL_API_KEY');
  const locationId = Deno.env.get('GHL_LOCATION_ID');

  let normalizedPhone = phone.trim().replace(/\s|-/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '+92' + normalizedPhone.slice(1);
  } else if (!normalizedPhone.startsWith('+')) {
    normalizedPhone = '+' + normalizedPhone;
  }

  const searchRes = await fetch(
    `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&query=${encodeURIComponent(normalizedPhone)}`,
    { headers: { Authorization: `Bearer ${apiKey}`, Version: '2021-07-28' } }
  );
  const searchData = await searchRes.json();
  const contact = searchData?.contacts?.[0];
  if (!contact) throw new Error(`No GHL contact for ${normalizedPhone}`);

  const msgRes = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Version: '2021-07-28' },
    body: JSON.stringify({ type: 'WhatsApp', contactId: contact.id, message }),
  });

  if (!msgRes.ok) throw new Error(`GHL send failed: ${await msgRes.text()}`);
  return await msgRes.json();
}

/**
 * Triggered by entity automation when a new PersonalizedOffer is created.
 * Sends WhatsApp to the specific user.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const offer = body?.data;

    if (!offer?.user_email) {
      return Response.json({ skipped: true, reason: 'No offer data' });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const user = users.find(u => u.email === offer.user_email);

    if (!user?.phone) {
      return Response.json({ skipped: true, reason: 'User has no phone' });
    }

    const offerEmoji = { discount: '🏷️', bonus_points: '⭐', free_item: '🎁', challenge: '🏆', recommendation: '💡' };
    const emoji = offerEmoji[offer.offer_type] || '🎉';
    const expiryText = offer.expiry_date
      ? `\n⏳ Expires: ${new Date(offer.expiry_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`
      : '';
    const bonusText = offer.points_bonus ? `\n🌟 +${offer.points_bonus} bonus points!` : '';
    const discountText = offer.discount_percentage ? `\n💰 ${offer.discount_percentage}% off!` : '';

    const message =
      `${emoji} *Exclusive Offer — Bean!*\n\n` +
      `Hi ${user.display_name || user.full_name || 'Coffee Lover'}! ☕\n\n` +
      `*${offer.title}*\n${offer.description}` +
      discountText + bonusText + expiryText +
      `\n\nOpen the Bean app to redeem before it expires! 🫘`;

    await sendWhatsApp(user.phone, message);
    return Response.json({ success: true, sent_to: offer.user_email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});