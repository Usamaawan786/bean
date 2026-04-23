import { format, formatDistanceToNow } from "date-fns";

/**
 * Parse a date string safely — treats the value as UTC if no timezone info is present.
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  let str = typeof dateStr === "string" ? dateStr : dateStr.toString();
  // If the string has no timezone indicator, assume UTC by appending 'Z'
  if (typeof str === "string" && !str.endsWith("Z") && !str.includes("+") && !/[+-]\d{2}:\d{2}$/.test(str)) {
    str = str + "Z";
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a date for display in the user's local timezone: "Apr 20, 3:45 PM"
 */
export function formatDateTime(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return "";
  return format(d, "MMM d, h:mm a");
}

/**
 * Format relative time: "2 hours ago", "just now", etc.
 */
export function timeAgo(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return "";
  return formatDistanceToNow(d, { addSuffix: true });
}