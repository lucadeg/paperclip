import React from "react";

export function VideoEditorLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id="velGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="velGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#06b6d4" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x="4" y="8" width="40" height="32" rx="8" fill="#0f172a" stroke="url(#velGrad)" strokeWidth="2.5" filter="url(#velGlow)" />
      <rect x="8" y="11" width="4" height="4" rx="1" fill="#06b6d4" fillOpacity="0.8" />
      <rect x="16" y="11" width="4" height="4" rx="1" fill="#06b6d4" fillOpacity="0.8" />
      <rect x="28" y="11" width="4" height="4" rx="1" fill="#06b6d4" fillOpacity="0.8" />
      <rect x="36" y="11" width="4" height="4" rx="1" fill="#06b6d4" fillOpacity="0.8" />
      <rect x="8" y="33" width="4" height="4" rx="1" fill="#8b5cf6" fillOpacity="0.8" />
      <rect x="16" y="33" width="4" height="4" rx="1" fill="#8b5cf6" fillOpacity="0.8" />
      <rect x="28" y="33" width="4" height="4" rx="1" fill="#8b5cf6" fillOpacity="0.8" />
      <rect x="36" y="33" width="4" height="4" rx="1" fill="#8b5cf6" fillOpacity="0.8" />
      <path d="M20 18L32 24L20 30V18Z" fill="url(#velGrad)" />
      <circle cx="20" cy="24" r="2" fill="#ffffff" />
    </svg>
  );
}

export function SocialManagerLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id="smGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
        <filter id="smGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f43f5e" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="10" fill="#0f172a" stroke="url(#smGrad)" strokeWidth="2.5" filter="url(#smGlow)" />
      <circle cx="24" cy="24" r="5" fill="url(#smGrad)" />
      <circle cx="14" cy="15" r="3" fill="#fb923c" />
      <circle cx="34" cy="15" r="3" fill="#f43f5e" />
      <circle cx="34" cy="33" r="3" fill="#ec4899" />
      <circle cx="14" cy="33" r="3" fill="#fb7185" />
      <line x1="20" y1="21" x2="16" y2="17" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="28" y1="21" x2="32" y2="17" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="28" y1="27" x2="32" y2="31" stroke="#ec4899" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="20" y1="27" x2="16" y2="31" stroke="#fb7185" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2" fill="#ffffff" />
    </svg>
  );
}

export function ProjectManagerLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id="pmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="pmGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="10" fill="#0f172a" stroke="url(#pmGrad)" strokeWidth="2.5" filter="url(#pmGlow)" />
      <rect x="11" y="11" width="6" height="26" rx="2" fill="url(#pmGrad)" />
      <rect x="21" y="18" width="6" height="19" rx="2" fill="url(#pmGrad)" fillOpacity="0.8" />
      <rect x="31" y="14" width="6" height="23" rx="2" fill="url(#pmGrad)" fillOpacity="0.6" />
      <circle cx="14" cy="8" r="2" fill="#10b981" />
      <circle cx="24" cy="14" r="2" fill="#14b8a6" />
      <circle cx="34" cy="10" r="2" fill="#06b6d4" />
    </svg>
  );
}

export function ContentPlannerLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id="cpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <filter id="cpGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8b5cf6" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="10" fill="#0f172a" stroke="url(#cpGrad)" strokeWidth="2.5" filter="url(#cpGlow)" />
      <rect x="10" y="14" width="28" height="22" rx="4" fill="url(#cpGrad)" fillOpacity="0.15" stroke="url(#cpGrad)" strokeWidth="1.5" />
      <circle cx="16" cy="20" r="2" fill="#8b5cf6" />
      <circle cx="24" cy="20" r="2" fill="#6366f1" />
      <circle cx="32" cy="20" r="2" fill="#38bdf8" />
      <circle cx="16" cy="27" r="2" fill="#6366f1" />
      <circle cx="24" cy="27" r="2" fill="#38bdf8" />
      <circle cx="32" cy="27" r="2" fill="#8b5cf6" />
      <path d="M16 9V14M32 9V14" stroke="url(#cpGrad)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function CrmLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id="crmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <filter id="crmGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="10" fill="#0f172a" stroke="url(#crmGrad)" strokeWidth="2.5" filter="url(#crmGlow)" />
      <path d="M24 10L36 15V25C36 32.5 24 38 24 38C24 38 12 32.5 12 25V15L24 10Z" fill="url(#crmGrad)" fillOpacity="0.2" stroke="url(#crmGrad)" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="24" cy="20" r="4" fill="url(#crmGrad)" />
      <path d="M18 30C18 26.5 20.5 25 24 25C27.5 25 30 26.5 30 30" stroke="url(#crmGrad)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
