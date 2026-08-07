/**
 * Kristel Match butterfly-roof mark. Square 256x256 SVG, inline, transparent.
 * Recolors with currentColor. Size via className (e.g. size-10, size-12).
 */
export default function Logo({ className = "", ...props }) {
  return (
    <svg
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="18"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Butterfly roof: two planes sloping UP from a low central valley */}
      <path d="M 32 96 L 128 168 L 224 96" />
      {/* Two subtle vertical posts + a low horizon — mid-century modern silhouette */}
      <path d="M 64 200 L 64 172" strokeWidth="10" opacity="0.55" />
      <path d="M 192 200 L 192 172" strokeWidth="10" opacity="0.55" />
      <path d="M 40 216 L 216 216" strokeWidth="10" opacity="0.55" />
    </svg>
  );
}
