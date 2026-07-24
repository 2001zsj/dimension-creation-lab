import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';

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

function normalizeImageUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    url.pathname = url.pathname.replace(/\/{2,}/g, '/');
    return url.toString();
  } catch {
    return undefined;
  }
}

function stableHash(value: string): string { let result = 2166136261; for (const char of value) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); } return (result >>> 0).toString(16).padStart(8, '0'); }
function cachedCoverUrl(value: string): string | undefined { try { const url = new URL(value); if (url.hostname !== 'i0.hdslb.com') return undefined; const extension = url.pathname.match(/\.(jpe?g|png|webp|avif|gif)$/i)?.[1]?.toLowerCase() ?? 'jpg'; return `/assets/covers/yuc/${stableHash(value)}.${extension === 'jpeg' ? 'jpg' : extension}`; } catch { return undefined; } }

export function Cover({ seed, className = '', children, label, imageUrl }: CoverProps) {
  const normalizedUrl = useMemo(() => normalizeImageUrl(imageUrl), [imageUrl]);
  const candidates = useMemo(() => normalizedUrl
    ? [cachedCoverUrl(normalizedUrl), `/api/image?url=${encodeURIComponent(normalizedUrl)}`, normalizedUrl].filter((value): value is string => Boolean(value))
    : [], [normalizedUrl]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [from, to] = palettes[Math.abs(seed) % palettes.length];
  const style: CSSProperties = {
    backgroundImage: `radial-gradient(circle at 78% 16%, rgba(255,255,255,.35), transparent 28%), linear-gradient(135deg, ${from}, ${to})`,
  };

  useEffect(() => {
    setCandidateIndex(0);
    setLoaded(false);
  }, [normalizedUrl]);

  const activeSource = candidates[candidateIndex];
  const showImage = Boolean(activeSource);

  return (
    <div
      className={`cover ${showImage && !loaded ? 'cover-loading' : ''} ${className}`}
      style={style}
      role={!showImage && label ? 'img' : undefined}
      aria-label={!showImage ? label : undefined}
    >
      {showImage ? (
        <img
          className="cover-image"
          src={activeSource}
          alt={label ?? ''}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setCandidateIndex((current) => current + 1);
          }}
        />
      ) : (
        <span className="cover-grid" aria-hidden="true" />
      )}
      {!loaded && <span className="cover-skeleton" aria-hidden="true" />}
      {children}
    </div>
  );
}

