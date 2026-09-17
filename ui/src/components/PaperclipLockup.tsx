import type { SVGProps } from "react";

interface PaperclipLockupProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  decorative?: boolean;
  title?: string;
}

/**
 * The official MVX Content Planner lockup — mark plus wordmark.
 * Follows the theme automatically using currentColor.
 * High-contrast Linear/Shadcn enterprise aesthetic.
 */
export function PaperclipLockup({
  decorative = false,
  title = "MVX Content Planner",
  className,
  ...rest
}: PaperclipLockupProps) {
  return (
    <svg
      {...rest}
      className={className}
      viewBox="0 0 240 32"
      fill="none"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      focusable="false"
    >
      {/* MVX Official Geometric Vector Mark Badge */}
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="6"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <g transform="translate(4, 5.5) scale(0.072)">
        <path
          d="M 251 118 L 217 154 L 217 157 L 229 180 L 229 182 L 238 199 L 238 201 L 245 213 L 298 213 L 277 170 L 277 168 L 271 157 L 271 155 L 269 153 L 269 151 L 261 136 L 257 125 L 253 118 Z M 203 12 L 201 15 L 201 18 L 200 19 L 200 23 L 198 27 L 198 31 L 193 36 L 189 38 L 181 40 L 180 41 L 176 41 L 174 43 L 178 45 L 181 45 L 182 46 L 190 48 L 192 49 L 196 53 L 197 57 L 198 58 L 198 61 L 200 64 L 201 71 L 203 73 L 203 71 L 205 67 L 205 64 L 206 63 L 207 58 L 209 55 L 209 53 L 213 49 L 215 48 L 217 48 L 221 46 L 224 46 L 230 43 L 230 42 L 228 41 L 225 41 L 224 40 L 216 38 L 210 34 L 210 33 L 208 31 L 208 29 L 207 28 L 207 26 L 205 22 L 205 18 L 203 15 Z M 327 4 L 249 21 L 266 40 L 153 158 L 151 147 L 224 69 L 217 59 L 202 91 L 189 64 L 150 127 L 89 29 L 16 184 L 87 113 L 93 120 L 1 213 L 55 213 L 96 129 L 149 212 L 290 65 L 311 83 Z"
          fill="currentColor"
          fillRule="evenodd"
        />
      </g>

      {/* MVX Typography */}
      <text
        x="38"
        y="21"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="16"
        letterSpacing="0.06em"
      >
        MVX
      </text>

      {/* Subtle Divider */}
      <line
        x1="82"
        y1="9"
        x2="82"
        y2="23"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.3"
      />

      {/* ADS MASTER / CONTENT PLANNER Monospace / Tracking Text */}
      <text
        x="90"
        y="20.5"
        fill="currentColor"
        fillOpacity="0.92"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="600"
        fontSize="11"
        letterSpacing="0.14em"
      >
        ADS MASTER
      </text>
    </svg>
  );
}
