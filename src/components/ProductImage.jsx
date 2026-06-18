import { asset } from '../utils/assetPath';

/**
 * Render a product image with a WebP-first source set and a JPG fallback.
 *
 * Usage:
 *   <ProductImage src="/images/products/anti-tarnish/at-05.jpg"
 *                 alt="Cascading Flower Dangles"
 *                 size="sm"  // optional — uses -sm.webp 600px variant
 *                 priority   // optional — eager-loads + high fetchpriority
 *   />
 *
 * Why a wrapping <picture>?
 * - The optimizer emits both a high-quality WebP and a smaller WebP thumb;
 *   <source type="image/webp"> lets the browser pick WebP when supported.
 * - <img src="…jpg"> is the fallback for very old browsers and tools that
 *   don't speak WebP yet.
 * - Explicit width/height prevent CLS while the image streams in.
 */
export default function ProductImage({
  src,
  alt,
  size,
  className,
  priority = false,
  width,
  height,
  style,
  ...rest
}) {
  if (!src) return null;

  // Strip the extension so we can build sister URLs for .webp and -sm.webp.
  const dot = src.lastIndexOf('.');
  const ext = dot >= 0 ? src.slice(dot) : '';
  const stem = dot >= 0 ? src.slice(0, dot) : src;

  // If the source is already .webp (e.g. bracelet images), use it directly —
  // there are no -sm.webp thumbnails or .jpg fallbacks for these files.
  const isNativeWebp = ext === '.webp';

  const webpFull = asset(`${stem}.webp`);
  const webpSmall = isNativeWebp ? webpFull : asset(`${stem}-sm.webp`);
  const jpgFallback = isNativeWebp ? webpFull : asset(`${stem}.jpg`);

  // Pick the WebP source: small thumbnail when the consumer asks for it
  // (grid cards, mosaic small tiles), full quality otherwise.
  const webpSrc = size === 'sm' ? webpSmall : webpFull;

  // Default natural ratios for the new shoot. Setting `width` and `height`
  // attributes prevents layout shift while the image is still loading.
  const naturalWidth = width || (size === 'sm' ? 600 : 1200);
  const naturalHeight = height || (size === 'sm' ? 750 : 1500);

  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img
        src={jpgFallback}
        alt={alt || ''}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchpriority={priority ? 'high' : 'auto'}
        width={naturalWidth}
        height={naturalHeight}
        style={style}
        {...rest}
      />
    </picture>
  );
}
