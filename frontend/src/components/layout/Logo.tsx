interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  inverted?: boolean;
}

export default function Logo({
  className = '',
  size = 'md',
}: LogoProps) {
  const sizeClasses = {
    sm: 'w-[85px] sm:w-[95px]',
    md: 'w-[100px] sm:w-[120px]',
    lg: 'w-[140px] sm:w-[160px]',
  }[size];

  return (
    <div className={`flex items-center select-none ${className}`}>
      <img
        src="/LOGO_NEW_.png"
        alt="Narkadhai"
        className={`${sizeClasses} h-auto max-h-14 object-contain transition-transform group-hover:scale-105`}
      />
    </div>
  );
}
