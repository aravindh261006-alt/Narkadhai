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
    sm: 'w-[75px]',
    md: 'w-[85px] sm:w-[95px]',
    lg: 'w-[100px]',
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
