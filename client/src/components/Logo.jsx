/**
 * Kristel Match butterfly-roof mark. Inline SVG — guaranteed transparent,
 * inherits currentColor from the parent so it recolors with the theme.
 *
 * Wide format (roof profile is naturally wider than tall). Use `className`
 * to control width; height auto-scales via preserveAspectRatio.
 */
export default function Logo({ className = "", ...props }) {
  return (
    <svg
      viewBox="0 0 240 80"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Butterfly roof: two planes sloping UP from a low central valley */}
      <path d="M 16 20 L 120 62 L 224 20" />
      {/* Subtle horizon line under the roof, evokes a low-slung Palm Springs home */}
      <path d="M 32 72 L 208 72" strokeWidth="4" opacity="0.5" />
    </svg>
  );
}
