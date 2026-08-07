/**
 * Creates in-app Notification records mirroring a push notification, so app users
 * can review the full history of pushes they received inside the notification center.
 *
 * Used by sendPushNotification and sendTargetedPushNotification.
 *
 * @param base44 - a base44 client (must support asServiceRole.entities.Notification.bulkCreate)
 * @param opts
 *   - emails:       string[]  recipient emails (deduped, empties removed)
 *   - title:        string    push title
 *   - body:         string    push body (used as the notification message)
 *   - image_url:    string?
 *   - deep_link:    string?
 *   - from_email:   string  sender email (admin or system)
 *   - from_name:    string  sender display name
 *   - type:         "announcement" | "offer"  (default "announcement")
 */
export async function createInAppNotificationsForPush(base44, opts: {
  emails: string[];
  title: string;
  body: string;
  image_url?: string;
  deep_link?: string;
  from_email: string;
  from_name: string;
  type?: "announcement" | "offer";
}) {
  const {
    emails,
    title,
    body,
    image_url,
    deep_link,
    from_email,
    from_name,
    type = "announcement",
  } = opts;

  const uniqueEmails = Array.from(new Set((emails || []).filter((e) => e && e.trim())));
  if (uniqueEmails.length === 0) return { created: 0 };

  const records = uniqueEmails.map((email) => ({
    to_email: email,
    from_email: from_email || "bean@bean.coffee",
    from_name: from_name || "BEAN",
    type,
    message: body || title,
    title: title || undefined,
    image_url: image_url || undefined,
    deep_link: deep_link || undefined,
    is_read: false,
  }));

  const CHUNK = 400;
  let created = 0;
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK);
    try {
      await base44.asServiceRole.entities.Notification.bulkCreate(chunk);
      created += chunk.length;
    } catch (e) {
      console.error("createInAppNotificationsForPush chunk error:", e?.message || e);
    }
  }
  return { created };
}