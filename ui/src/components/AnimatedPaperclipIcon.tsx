import type { SVGProps } from "react";
import { cn } from "../lib/utils";

/**
 * Official MVX Ads Master Animated Vector Emblem.
 * Replaces the default Paperclip spinner with a high-contrast, linear-style enterprise emblem.
 */
export function AnimatedPaperclipIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("animate-pulse text-primary shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      {/* Outer rounded container with glowing stroke */}
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="7"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.5"
        className="opacity-90"
      />
      {/* Inner geometric vector logo */}
      <g transform="translate(4, 5.5) scale(0.072)">
        <path
          d="M 251 118 L 217 154 L 217 157 L 229 180 L 229 182 L 238 199 L 238 201 L 245 213 L 298 213 L 277 170 L 277 168 L 271 157 L 271 155 L 269 153 L 269 151 L 261 136 L 257 125 L 253 118 Z M 203 12 L 201 15 L 201 18 L 200 19 L 200 23 L 198 27 L 198 31 L 193 36 L 189 38 L 181 40 L 180 41 L 176 41 L 174 43 L 178 45 L 181 45 L 182 46 L 190 48 L 192 49 L 196 53 L 197 57 L 198 58 L 198 61 L 200 64 L 201 71 L 203 73 L 203 71 L 205 67 L 205 64 L 206 63 L 207 58 L 209 55 L 209 53 L 213 49 L 215 48 L 217 48 L 221 46 L 224 46 L 230 43 L 230 42 L 228 41 L 225 41 L 224 40 L 216 38 L 210 34 L 210 33 L 208 31 L 208 29 L 207 28 L 207 26 L 205 22 L 205 18 L 203 15 Z M 327 4 L 249 21 L 266 40 L 153 158 L 151 147 L 224 69 L 217 59 L 202 91 L 189 64 L 150 127 L 89 29 L 16 184 L 87 113 L 93 120 L 1 213 L 55 213 L 96 129 L 149 212 L 290 65 L 311 83 Z"
          fill="currentColor"
          fillRule="evenodd"
        />
      </g>
    </svg>
  );
}

/** Full-page loading state: MVX Ads Master Logo with ambient glow and enterprise branding */
export function PaperclipLoading({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col min-h-dvh w-full items-center justify-center bg-background/95 backdrop-blur-xs select-none",
        className
      )}
    >
      <div className="relative flex flex-col items-center gap-4 p-8">
        {/* Ambient background glow */}
        <div className="absolute -inset-4 bg-primary/15 rounded-full blur-2xl animate-pulse pointer-events-none" />

        {/* Animated MVX Vector Logo */}
        <div className="relative z-10 transition-transform duration-300">
          <AnimatedPaperclipIcon className="h-20 w-20 text-primary drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
        </div>

        {/* Brand Lockup */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-wider text-foreground">
              MVX
            </span>
            <span className="h-3 w-px bg-border/80" />
            <span className="font-semibold text-xs tracking-widest text-muted-foreground uppercase">
              Ads Master
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/80 font-mono tracking-tight animate-pulse">
            Sovereign Control Plane • Initializing…
          </p>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
