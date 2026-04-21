import { format, formatDistanceToNow, parseISO } from "date-fns";

/**
 * Parse a date string safely — handles both ISO strings and timestamps.
 * Returns a proper Date object in local time.
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a date for display: "Apr 20, 3:45 PM"
 */
export function formatDateTime(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return "";
  return format(d, "MMM d, h:mm a");
}

/**
 * Format relative time: "2 hours ago", "just now", etc.
 * Falls back to absolute if date is invalid.
 */
export function timeAgo(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return "";
  return formatDistanceToNow(d, { addSuffix: true });
}