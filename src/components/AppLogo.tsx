import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textSize?: 'sm' | 'md' | 'lg' | 'xl';
  subtitle?: string;
}

export function AppLogo({ 
  size = 36, 
  className = '', 
  showText = false,
  textSize = 'md',
  subtitle = 'Supermercado Inteligente'
}: AppLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official App Cart Icon */}
      <div 
        className="relative flex items-center justify-center shrink-0 rounded-2xl bg-gradient-to-tr from-sky-600 via-sky-500 to-emerald-400 p-2 text-white shadow-lg shadow-sky-500/20 ring-2 ring-sky-500/20 transition-transform active:scale-95"
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox="0 0 48 48" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          {/* Grocery items inside cart */}
          <path 
            d="M17 18C17 14.5 19.5 12 23 12C26.5 12 29 14.5 29 18H17Z" 
            fill="#34D399" 
          />
          <path 
            d="M27 18C27 13.5 30 11 34 11C38 11 40 14 39 18H27Z" 
            fill="#FBBF24" 
          />
          <circle cx="23" cy="11" r="2.5" fill="#EF4444" />
          <path d="M23 8.5C23.5 7 25 6 26.5 6" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />

          {/* Cart Basket Base */}
          <path 
            d="M8 12H13.5L18.2 27.5C18.6 28.8 19.8 29.8 21.2 29.8H36.8C38.2 29.8 39.4 28.8 39.8 27.5L43 17H15" 
            stroke="white" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Cart Grid Lines */}
          <path d="M20 19H40" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.75" />
          <path d="M22 25H38" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.75" />
          <path d="M26 17V29" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.75" />
          <path d="M33 17V29" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.75" />

          {/* Wheels */}
          <circle cx="21.5" cy="38.5" r="3.5" fill="white" />
          <circle cx="21.5" cy="38.5" r="1.5" fill="#0284C7" />
          
          <circle cx="36.5" cy="38.5" r="3.5" fill="white" />
          <circle cx="36.5" cy="38.5" r="1.5" fill="#0284C7" />

          {/* Sparkle/Check badge */}
          <path 
            d="M39 7L40.5 10.5L44 12L40.5 13.5L39 17L37.5 13.5L34 12L37.5 10.5L39 7Z" 
            fill="#FDE047" 
          />
        </svg>
      </div>

      {showText && (
        <div>
          <span className={`font-black tracking-tight block text-neutral-950 leading-tight ${
            textSize === 'xl' ? 'text-2xl' : textSize === 'lg' ? 'text-xl' : textSize === 'sm' ? 'text-sm' : 'text-base'
          }`}>
            Feira Fácil
          </span>
          {subtitle && (
            <span className="text-[10px] text-neutral-400 block font-semibold uppercase tracking-wider mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
