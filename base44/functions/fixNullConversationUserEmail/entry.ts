import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all messages missing conversation_user_email
  const allMessages = await base44.asServiceRole.entities.ChatMessage.list('-created_date', 2000);
  const broken = allMessages.filter(m => !m.conversation_user_email);

  if (broken.length === 0) {
    return Response.json({ success: true, fixed: 0, message: 'Nothing to fix' });
  }

  // Build a map of conversation_id -> user_email
  const convIds = [...new Set(broken.map(m => m.conversation_id).filter(Boolean))];
  const convMap = {};
  for (const convId of convIds) {
    const conv = await base44.asServiceRole.entities.Conversation.get(convId);
    if (conv?.user_email) convMap[convId] = conv.user_email;
  }

  let fixed = 0;
  for (const msg of broken) {
    const userEmail = convMap[msg.conversation_id];
    if (userEmail) {
      await base44.asServiceRole.entities.ChatMessage.update(msg.id, { conversation_user_email: userEmail });
      fixed++;
    }
  }

  console.log(`[fixNullConversationUserEmail] Fixed ${fixed} of ${broken.length} broken messages`);
  return Response.json({ success: true, broken: broken.length, fixed });
});