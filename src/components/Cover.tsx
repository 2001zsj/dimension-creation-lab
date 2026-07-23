import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

interface CoverProps {
  seed: number;
  className?: string;
  children?: ReactNode;
  label?: string;
  imageUrl?: string;
}

const palettes = [
  ['#7c5cfc', '#5ccfe6'], ['#f28ab2', '#a96bff'], ['#3f87ff', '#7c5cfc'],
  ['#ff9a9e', '#fecfef'], ['#4facfe', '#00f2fe'], ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'], ['#667eea', '#764ba2'], ['#30cfd0', '#330867'],
  ['#a18cd1', '#fbc2eb'], ['#f6d365', '#fda085'], ['#84fab0', '#8fd3f4'],
];

export function Cover({ seed, className = '', children, label, imageUrl }: CoverProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [from, to] = palettes[Math.abs(seed) % palettes.length];
  const style: CSSProperties = {
    backgroundImage: `radial-gradient(circle at 78% 16%, rgba(255,255,255,.35), transparent 28%), linear-gradient(135deg, ${from}, ${to})`,
  };

  useEffect(() => setImageFailed(false), [imageUrl]);

  return (
    <div className={`cover ${className}`} style={style} role={!imageUrl && label ? 'img' : undefined} aria-label={!imageUrl ? label : undefined}>
      {imageUrl && !imageFailed ? (
        <img
          className="cover-image"
          src={imageUrl}
          alt={label ?? ''}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : <span className="cover-grid" aria-hidden="true" />}
      {children}
    </div>
  );
}
