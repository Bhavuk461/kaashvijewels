import { asset } from '../utils/assetPath';

/**
 * Render a product image with a WebP-first source set and a JPG fallback.
 *
 * Remote URLs (e.g. admin-uploaded R2 images) are rendered directly: they
 * are a single uploaded file with no -sm.webp/.jpg sister variants, so we
 * skip the source-set derivation entirely.
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

  const naturalWidth = width || (size === 'sm' ? 600 : 1200);
  const naturalHeight = height || (size === 'sm' ? 750 : 1500);

  // Remote/absolute URLs (R2 admin uploads) have no sister variants —
  // render them directly as a plain <img>.
  const isRemote = /^https?:\/\//i.test(src);
  if (isRemote) {
    return (
      <img
        src={src}
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
    );
  }

  // Strip the extension so we can build sister URLs for .webp and -sm.webp.
  const dot = src.lastIndexOf('.');
  const ext = dot >= 0 ? src.slice(dot) : '';
  const stem = dot >= 0 ? src.slice(0, dot) : src;

  const isNativeWebp = ext === '.webp';

  const webpFull = asset(`${stem}.webp`);
  const webpSmall = isNativeWebp ? webpFull : asset(`${stem}-sm.webp`);
  const jpgFallback = isNativeWebp ? webpFull : asset(`${stem}.jpg`);

  const webpSrc = size === 'sm' ? webpSmall : webpFull;

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
