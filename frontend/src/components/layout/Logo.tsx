import { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  inverted?: boolean;
}

export default function Logo({
  className = '',
  size = 'md',
  showSubtitle = true,
  inverted = true,
}: LogoProps) {
  const [imgError, setImgError] = useState(false);

  const iconSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  }[size];

  const titleSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  }[size];

  const subtitleSizeClasses = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Logo Image or Stylized Icon Emblem */}
      <div
        className={`${iconSizeClasses} rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-sm`}
      >
        {!imgError ? (
          <img
            src="/logo.png"
            alt="Narkadhai Logo"
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#D4A017] to-[#8F650A] flex items-center justify-center text-[#2C1810] font-bold shadow-inner">
            <span className="font-display font-bold text-base leading-none">ந</span>
          </div>
        )}
      </div>

      {/* Bilingual Brand Name */}
      <div className="flex flex-col justify-center leading-tight">
        <span
          className={`font-display font-bold tracking-tight ${titleSizeClasses} ${
            inverted ? 'text-[#FDFAF5]' : 'text-[#2C1810]'
          }`}
        >
          நற்கதை
        </span>
        {showSubtitle && (
          <span
            className={`font-semibold tracking-[0.22em] text-[#D4A017] uppercase ${subtitleSizeClasses}`}
          >
            Narkadhai
          </span>
        )}
      </div>
    </div>
  );
}
