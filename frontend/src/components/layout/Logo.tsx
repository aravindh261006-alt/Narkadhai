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
    sm: 'w-[110px]',
    md: 'w-[135px] sm:w-[150px]',
    lg: 'w-[170px] sm:w-[190px]',
  }[size];

  return (
    <div className={`flex items-center select-none ${className}`}>
      <img
        src="/logo.png"
        alt="Narkadhai"
        className={`${sizeClasses} h-auto max-h-14 object-contain transition-transform group-hover:scale-105`}
      />
    </div>
  );
}
