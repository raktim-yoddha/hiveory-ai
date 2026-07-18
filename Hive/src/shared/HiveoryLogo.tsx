/**
 * Hiveory mark — a dark honeycomb hex with a gold bee, wings spread. Used in
 * the title bar and, rendered to PNG, as the app/taskbar icon.
 */
export default function HiveoryLogo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Hiveory"
    >
      <defs>
        <linearGradient id="hv-badge" x1="10" y1="4" x2="38" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#26201a" />
          <stop offset="1" stopColor="#120d08" />
        </linearGradient>
        <linearGradient id="hv-gold" x1="16" y1="12" x2="32" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f4d35e" />
          <stop offset="1" stopColor="#c9a227" />
        </linearGradient>
      </defs>

      {/* Honeycomb hex badge */}
      <path
        d="M24 2.5 43 13.25v21.5L24 45.5 5 34.75v-21.5L24 2.5Z"
        fill="url(#hv-badge)"
        stroke="#c9a227"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Bee */}
      <g>
        {/* wings */}
        <ellipse cx="16.5" cy="18" rx="5.4" ry="3.4" transform="rotate(-28 16.5 18)"
          fill="#f4d35e" opacity="0.28" stroke="url(#hv-gold)" strokeWidth="1" />
        <ellipse cx="31.5" cy="18" rx="5.4" ry="3.4" transform="rotate(28 31.5 18)"
          fill="#f4d35e" opacity="0.28" stroke="url(#hv-gold)" strokeWidth="1" />
        {/* antennae */}
        <path d="M21 13.8 18.5 9M27 13.8 29.5 9" stroke="url(#hv-gold)" strokeWidth="1.5"
          strokeLinecap="round" fill="none" />
        <circle cx="18.5" cy="9" r="1.1" fill="#f4d35e" />
        <circle cx="29.5" cy="9" r="1.1" fill="#f4d35e" />
        {/* body */}
        <path
          d="M24 15.5c4.2 0 6.7 3 6.7 7.3 0 5.6-3 11.7-6.7 11.7s-6.7-6.1-6.7-11.7c0-4.3 2.5-7.3 6.7-7.3Z"
          fill="url(#hv-gold)"
          stroke="#8a6a10"
          strokeWidth="0.6"
        />
        {/* dark stripes */}
        <g fill="#160f06">
          <path d="M18.4 21.5h11.2c-.2-.9-.5-1.7-.9-2.4H19.3c-.4.7-.7 1.5-.9 2.4Z" />
          <path d="M17.7 26.4h12.6c.2-.9.3-1.7.3-2.5H17.4c0 .8.1 1.6.3 2.5Z" />
          <path d="M19 31h10c.5-.8.9-1.7 1.2-2.6H17.8c.3.9.7 1.8 1.2 2.6Z" />
        </g>
      </g>
    </svg>
  );
}
