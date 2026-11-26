import React from 'react';
import { CityLandmarkTheme, CountryCode } from '../utils/europeLocations';

interface CountryFlagIconProps {
  code: CountryCode;
  className?: string;
  label?: string;
}

/**
 * Crisp inline SVG country flag so flags always render in full color
 * across Windows, Linux, Android, macOS, and iOS (unlike regional indicator emojis).
 */
export const CountryFlagIcon: React.FC<CountryFlagIconProps> = ({
  code,
  className = 'w-[18px] h-[13px]',
  label,
}) => {
  const commonProps = {
    viewBox: '0 0 24 18',
    className: `${className} rounded-[2px] border border-slate-300/80 shrink-0 inline-block shadow-[0_0_0_0.5px_rgba(15,23,42,0.04)]`,
    role: 'img' as const,
    'aria-label': label || `${code} 국기`,
  };

  switch (code) {
    case 'FR':
      return (
        <svg {...commonProps}>
          <rect width="8" height="18" x="0" y="0" fill="#0055A4" />
          <rect width="8" height="18" x="8" y="0" fill="#FFFFFF" />
          <rect width="8" height="18" x="16" y="0" fill="#EF4135" />
        </svg>
      );
    case 'CH':
      return (
        <svg {...commonProps}>
          <rect width="24" height="18" x="0" y="0" fill="#DA291C" />
          <rect width="4" height="10" x="10" y="4" fill="#FFFFFF" />
          <rect width="10" height="4" x="7" y="7" fill="#FFFFFF" />
        </svg>
      );
    case 'IT':
      return (
        <svg {...commonProps}>
          <rect width="8" height="18" x="0" y="0" fill="#009246" />
          <rect width="8" height="18" x="8" y="0" fill="#FFFFFF" />
          <rect width="8" height="18" x="16" y="0" fill="#CE2B37" />
        </svg>
      );
    case 'VA':
      return (
        <svg {...commonProps}>
          <rect width="12" height="18" x="0" y="0" fill="#FFE000" />
          <rect width="12" height="18" x="12" y="0" fill="#FFFFFF" />
          <circle cx="18" cy="9" r="2.2" fill="#D4AF37" />
        </svg>
      );
    case 'GB':
      return (
        <svg {...commonProps}>
          <rect width="24" height="18" fill="#012169" />
          <path d="M0 0L24 18M24 0L0 18" stroke="#FFFFFF" strokeWidth="3.2" />
          <path d="M0 0L24 18M24 0L0 18" stroke="#C8102E" strokeWidth="1.6" />
          <path d="M12 0V18M0 9H24" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M12 0V18M0 9H24" stroke="#C8102E" strokeWidth="3" />
        </svg>
      );
    case 'ES':
      return (
        <svg {...commonProps}>
          <rect width="24" height="4.5" y="0" fill="#AA151B" />
          <rect width="24" height="9" y="4.5" fill="#F1BF00" />
          <rect width="24" height="4.5" y="13.5" fill="#AA151B" />
          <rect width="3" height="4" x="5.5" y="7" rx="0.8" fill="#AA151B" />
        </svg>
      );
    case 'DE':
      return (
        <svg {...commonProps}>
          <rect width="24" height="6" y="0" fill="#111827" />
          <rect width="24" height="6" y="6" fill="#DD0000" />
          <rect width="24" height="6" y="12" fill="#FFCE00" />
        </svg>
      );
    case 'AT':
      return (
        <svg {...commonProps}>
          <rect width="24" height="6" y="0" fill="#ED2939" />
          <rect width="24" height="6" y="6" fill="#FFFFFF" />
          <rect width="24" height="6" y="12" fill="#ED2939" />
        </svg>
      );
    case 'CZ':
      return (
        <svg {...commonProps}>
          <rect width="24" height="9" y="0" fill="#FFFFFF" />
          <rect width="24" height="9" y="9" fill="#D7141A" />
          <polygon points="0,0 12,9 0,18" fill="#11457E" />
        </svg>
      );
    case 'NL':
      return (
        <svg {...commonProps}>
          <rect width="24" height="6" y="0" fill="#AE1C28" />
          <rect width="24" height="6" y="6" fill="#FFFFFF" />
          <rect width="24" height="6" y="12" fill="#21468B" />
        </svg>
      );
    case 'BE':
      return (
        <svg {...commonProps}>
          <rect width="8" height="18" x="0" fill="#111827" />
          <rect width="8" height="18" x="8" fill="#FAE042" />
          <rect width="8" height="18" x="16" fill="#ED2939" />
        </svg>
      );
    case 'PT':
      return (
        <svg {...commonProps}>
          <rect width="9.5" height="18" x="0" fill="#006600" />
          <rect width="14.5" height="18" x="9.5" fill="#FF0000" />
          <circle cx="9.5" cy="9" r="3.2" fill="#FFCC00" />
        </svg>
      );
    case 'GR':
      return (
        <svg {...commonProps}>
          <rect width="24" height="18" fill="#0D5EAF" />
          <rect width="24" height="2" y="2" fill="#FFFFFF" />
          <rect width="24" height="2" y="6" fill="#FFFFFF" />
          <rect width="24" height="2" y="10" fill="#FFFFFF" />
          <rect width="24" height="2" y="14" fill="#FFFFFF" />
          <rect width="10" height="10" x="0" y="0" fill="#0D5EAF" />
          <rect width="2" height="10" x="4" y="0" fill="#FFFFFF" />
          <rect width="10" height="2" x="0" y="4" fill="#FFFFFF" />
        </svg>
      );
    case 'EU':
    default:
      return (
        <svg {...commonProps}>
          <rect width="24" height="18" fill="#003399" />
          <circle
            cx="12"
            cy="9"
            r="4.5"
            fill="none"
            stroke="#FFCC00"
            strokeWidth="1.3"
            strokeDasharray="1.2 1.8"
          />
        </svg>
      );
  }
};

interface CityLandmarkBadgeProps {
  theme: CityLandmarkTheme;
  countryCode: CountryCode;
  city: string;
}

/**
 * Miniature representative city landmark artwork + corner country flag badge.
 */
export const CityLandmarkBadge: React.FC<CityLandmarkBadgeProps> = ({
  theme,
  countryCode,
  city,
}) => {
  const palette: Record<CityLandmarkTheme, { bg: string; border: string }> = {
    paris: { bg: 'from-sky-50 to-indigo-100/90', border: 'border-indigo-200' },
    swiss_alps: { bg: 'from-cyan-50 to-sky-100/90', border: 'border-cyan-200' },
    lucerne: { bg: 'from-blue-50 to-teal-100/80', border: 'border-blue-200' },
    florence: { bg: 'from-amber-50 to-orange-100/90', border: 'border-amber-200' },
    rome: { bg: 'from-stone-100 to-amber-100/90', border: 'border-amber-200' },
    europe: { bg: 'from-slate-100 to-blue-100/80', border: 'border-slate-200' },
  };

  const style = palette[theme];

  return (
    <div
      className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${style.bg} border ${style.border} flex items-center justify-center shrink-0 overflow-visible`}
      title={city}
    >
      {theme === 'paris' && (
        <svg viewBox="0 0 36 36" className="w-7 h-7" aria-hidden="true">
          <circle cx="27" cy="9" r="3" fill="#FDE68A" />
          {/* Eiffel Tower silhouette */}
          <path
            d="M18 4L19.2 11L21 19L25.5 29H21.2C20.6 26.2 19.4 24.8 18 24.8C16.6 24.8 15.4 26.2 14.8 29H10.5L15 19L16.8 11L18 4Z"
            fill="#1E3A8A"
          />
          <rect x="14.2" y="18.2" width="7.6" height="1.6" rx="0.6" fill="#0F172A" />
          <rect x="15.5" y="12.2" width="5" height="1.3" rx="0.5" fill="#0F172A" />
          <path d="M7 30H29" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {theme === 'swiss_alps' && (
        <svg viewBox="0 0 36 36" className="w-7 h-7" aria-hidden="true">
          <circle cx="27" cy="8.5" r="2.8" fill="#FCD34D" />
          {/* Rear peak */}
          <polygon points="15,28 24,11 32,28" fill="#64748B" />
          <polygon points="24,11 21,16.5 23,15.8 24.5,17.2 26.8,16.4" fill="#FFFFFF" />
          {/* Main peak */}
          <polygon points="4,28 14.5,8 25,28" fill="#0F766E" />
          <polygon points="14.5,8 10.6,15.5 13,14.6 15,16.4 18.2,15.2" fill="#FFFFFF" />
          <path d="M4 29H32" stroke="#BAE6FD" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}

      {theme === 'lucerne' && (
        <svg viewBox="0 0 36 36" className="w-7 h-7" aria-hidden="true">
          <polygon points="5,22 14,10 22,22" fill="#94A3B8" />
          <polygon points="16,22 25,11 32,22" fill="#64748B" />
          {/* Water Tower + Chapel Bridge */}
          <rect x="23" y="15" width="4.5" height="9" fill="#92400E" />
          <polygon points="22.3,15 25.25,11.8 28.2,15" fill="#B91C1C" />
          <path d="M5 23H29" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M4 27C8 25.5 12 28.5 16 27C20 25.5 24 28.5 32 27" fill="none" stroke="#0284C7" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}

      {theme === 'florence' && (
        <svg viewBox="0 0 36 36" className="w-7 h-7" aria-hidden="true">
          {/* Brunelleschi's Duomo */}
          <rect x="17" y="6.5" width="2" height="2.8" fill="#F59E0B" />
          <path d="M10 20C10 12.5 14 9 18 9C22 9 26 12.5 26 20Z" fill="#C2410C" />
          <path d="M14.5 20C14.5 13.5 16.5 9.5 18 9.5C19.5 9.5 21.5 13.5 21.5 20" fill="none" stroke="#FED7AA" strokeWidth="1" />
          <rect x="9" y="20" width="18" height="9" rx="1" fill="#F8FAFC" stroke="#9A3412" strokeWidth="1.2" />
          <rect x="27" y="13" width="3.5" height="16" fill="#FDBA74" stroke="#9A3412" strokeWidth="1" />
        </svg>
      )}

      {theme === 'rome' && (
        <svg viewBox="0 0 36 36" className="w-7 h-7" aria-hidden="true">
          {/* Colosseum silhouette */}
          <path d="M5 28V14L19 11V15H31V28H5Z" fill="#D97706" />
          <rect x="7.5" y="16" width="2.5" height="3.5" rx="1.2" fill="#FFFBEB" />
          <rect x="12" y="15.5" width="2.5" height="3.5" rx="1.2" fill="#FFFBEB" />
          <rect x="16.5" y="15" width="2.5" height="3.5" rx="1.2" fill="#FFFBEB" />
          <rect x="7.5" y="22" width="2.5" height="4" rx="1.2" fill="#FFFBEB" />
          <rect x="12" y="22" width="2.5" height="4" rx="1.2" fill="#FFFBEB" />
          <rect x="16.5" y="22" width="2.5" height="4" rx="1.2" fill="#FFFBEB" />
          <rect x="21.5" y="22" width="2.5" height="4" rx="1.2" fill="#FFFBEB" />
          <rect x="26" y="22" width="2.5" height="4" rx="1.2" fill="#FFFBEB" />
          <path d="M4 29H32" stroke="#92400E" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )}

      {theme === 'europe' && (
        <svg viewBox="0 0 36 36" className="w-7 h-7" aria-hidden="true">
          <rect x="7" y="15" width="9" height="14" fill="#3B82F6" />
          <polygon points="6,15 11.5,9 17,15" fill="#1D4ED8" />
          <rect x="18" y="12" width="10" height="17" fill="#60A5FA" />
          <polygon points="17,12 23,6 29,12" fill="#1E40AF" />
          <rect x="10" y="19" width="2.5" height="3.5" fill="#EFF6FF" />
          <rect x="21.5" y="16" width="3" height="4" fill="#EFF6FF" />
        </svg>
      )}

      {/* Small country flag anchored at bottom-right corner */}
      <span className="absolute -bottom-1 -right-1 leading-none">
        <CountryFlagIcon code={countryCode} className="w-[16px] h-[11px]" />
      </span>
    </div>
  );
};
