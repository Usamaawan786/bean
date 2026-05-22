/**
 * Blue verified checkmark badge for the official Bean account.
 * Renders inline next to the username.
 */
export default function BeanVerifiedBadge({ size = "sm" }) {
  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${dim} flex-shrink-0`}
      aria-label="Verified Bean account"
    >
      <circle cx="12" cy="12" r="12" fill="#1D9BF0" />
      <path
        d="M7 12.5l3.5 3.5 6.5-7"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}