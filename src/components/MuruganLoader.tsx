import muruganGif from '../custom-assets/murugan.gif';

type MuruganLoaderProps = {
  size?: number;
  variant?: 'inline' | 'button' | 'card' | 'page';
  className?: string;
};

export function MuruganLoader({ size, variant = 'inline', className = '' }: MuruganLoaderProps) {
  const dimension =
    typeof size === 'number'
      ? `${size}px`
      : variant === 'page'
        ? 'clamp(90px, 22vw, 180px)'
        : variant === 'card'
          ? 'clamp(40px, 10vw, 88px)'
          : variant === 'button'
            ? 'clamp(18px, 4.5vw, 28px)'
            : 'clamp(28px, 7vw, 48px)';

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div className="relative" style={{ width: dimension, height: dimension }}>
        <img
          src={muruganGif}
          alt="Loading..."
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}
