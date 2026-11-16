/**
 * Image optimization utilities for Next.js storefront.
 * Handles Cloudinary auto-format (AVIF/WebP), smart resizing, and quality compression,
 * as well as Unsplash parameters.
 */

export function optimizeImageUrl(
  url: string | undefined | null,
  options: { width?: number; quality?: number | string; height?: number } = {}
): string {
  if (!url || typeof url !== 'string') return '';
  const { width = 800, quality = 'auto' } = options;

  // Cloudinary image transformation
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    // Avoid double transforming
    if (url.includes('/upload/f_auto') || url.includes('/upload/w_')) {
      return url;
    }
    const parts = url.split('/upload/');
    const transforms = [`f_auto`, `q_${quality}`, `w_${width}`, `c_limit`].join(',');
    return `${parts[0]}/upload/${transforms}/${parts[1]}`;
  }

  // Unsplash image transformation
  if (url.includes('images.unsplash.com')) {
    const base = url.split('?')[0];
    const q = typeof quality === 'number' ? quality : 75;
    return `${base}?auto=format&fit=crop&w=${width}&q=${q}`;
  }

  return url;
}
