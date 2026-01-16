import muruganGif from '../assets/murugan.gif';

type MuruganLoaderProps = {
  size?: number;
  className?: string;
};

export function MuruganLoader({ size = 40, className = '' }: MuruganLoaderProps) {
  return (
    <div className={`inline-block ${className}`}>
      <div className="relative flex items-center justify-center overflow-hidden" style={{ width: size, height: size }}>
        <img
          src={muruganGif}
          alt="Loading..."
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}
