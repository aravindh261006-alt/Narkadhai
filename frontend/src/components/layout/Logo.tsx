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
    md: 'w-[130px] sm:w-[145px]',
    lg: 'w-[160px] sm:w-[180px]',
  }[size];

  return (
    <div className={`flex items-center select-none ${className}`}>
      <img
        src="/logo.png"
        alt="Narkadhai"
        className={`${sizeClasses} h-auto max-h-12 object-contain transition-transform group-hover:scale-105`}
      />
    </div>
  );
}
