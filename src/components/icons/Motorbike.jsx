import React from "react";

// Delivery motorbike icon (CD70-style). Drawn to match lucide-react's
// stroke style so it works as a drop-in: <Motorbike className="h-5 w-5" />
const Motorbike = React.forwardRef(function Motorbike(
  { className = "", size = 24, strokeWidth = 2, color = "currentColor", ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* wheels */}
      <circle cx="5" cy="17" r="3" />
      <circle cx="19" cy="17" r="3" />
      {/* body: rear wheel up to seat, tank, down to front wheel */}
      <path d="M5 17h4l3-5h4" />
      <path d="M9 17l-1.5-4.5" />
      {/* seat */}
      <path d="M6 12.5h5" />
      {/* front fork and handlebar */}
      <path d="M16 12l3 5" />
      <path d="M15 8.5h2.5l-1.5 3.5" />
      {/* delivery box on the back */}
      <rect x="2" y="8" width="5" height="4" rx="0.5" />
    </svg>
  );
});

export default Motorbike;
