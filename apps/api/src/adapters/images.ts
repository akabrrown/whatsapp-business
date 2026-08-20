// Image adapter: deterministic placeholder SVGs in sim mode,
// Cloudinary passthrough in cloudinary mode (§3.4).
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config.js';

const rawUrl = config.images.cloudinaryUrl || process.env.CLOUDINARY_URL || '';
const match = rawUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);

if (match) {
  cloudinary.config({
    api_key: match[1],
    api_secret: match[2],
    cloud_name: match[3],
    secure: true,
  });
}

export async function uploadToCloudinary(base64OrUrl: string, folder: string = 'tobi_clothings/products', publicId?: string): Promise<string> {
  if (!base64OrUrl) return base64OrUrl;
  if (base64OrUrl.startsWith('http://') || base64OrUrl.startsWith('https://')) return base64OrUrl;
  if (!base64OrUrl.startsWith('data:image/')) return base64OrUrl;

  try {
    const res = await cloudinary.uploader.upload(base64OrUrl, {
      folder,
      ...(publicId ? { public_id: publicId } : {}),
      overwrite: true,
    });
    return res.secure_url;
  } catch (err) {
    console.error('Failed to upload image to Cloudinary:', err);
    return base64OrUrl;
  }
}

export function productImage(seed: string): string {
  if (config.images.mode === 'cloudinary' && seed.startsWith('http')) return seed;
  // Data-URI placeholder: warm off-white background + brand block.
  const palette = ['#2C3E66', '#C97B84', '#D9A679'];
  const c = palette[Math.abs(hash(seed)) % palette.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#FAF7F5"/><rect x="40" y="60" width="520" height="620" fill="${c}" opacity="0.85"/><text x="300" y="740" text-anchor="middle" font-family="Georgia" font-size="28" fill="#2B2B2B">ROSE &amp; DENIM</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

/** Upload validation (§14.6): images only, ≤5MB, type-checked. */
export function validateUpload(contentType: string, sizeBytes: number): { ok: boolean; error?: string } {
  if (!contentType.startsWith('image/')) return { ok: false, error: 'Images only' };
  if (sizeBytes > 5 * 1024 * 1024) return { ok: false, error: 'Max 5MB' };
  return { ok: true };
}
