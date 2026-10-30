import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../firebase.js';

// 4K (UHD) long side. Larger originals are scaled down before upload; smaller ones are kept as-is.
export const MAX_SIDE = 3840;
export const THUMB_SIDE = 1600; // list/gallery images; large enough to stay sharp on high-DPI screens
const RESIZE_QUALITY = 0.95; // only used when an image has to be scaled down or converted
const THUMB_QUALITY = 0.88;
const KEEP_AS_IS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_UPLOAD_BYTES = 18 * 1024 * 1024; // storage.rules allows < 20 MB

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function render(bitmap, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  let blob = await toBlob(canvas, 'image/webp', quality);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality);
  canvas.width = 0;
  canvas.height = 0;
  return { blob, width, height, ext: blob.type === 'image/webp' ? 'webp' : 'jpg' };
}

async function put(path, blob) {
  const r = ref(storage, path);
  await uploadBytes(r, blob, {
    contentType: blob.type,
    cacheControl: 'public,max-age=31536000,immutable',
  });
  return getDownloadURL(r);
}

/** Resize (max 4K) + thumbnail, upload both, return the image record stored on the project. */
export async function processAndUpload(projectId, file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    // Within 4K and a web-friendly format: upload the original bytes untouched (no quality loss).
    // Only larger images, other formats (HEIC, TIFF, ...) or very heavy files are re-encoded.
    const keepExt = KEEP_AS_IS[file.type];
    const fitsAsIs =
      keepExt && Math.max(bitmap.width, bitmap.height) <= MAX_SIDE && file.size <= MAX_UPLOAD_BYTES;

    let full;
    if (fitsAsIs) {
      full = { blob: file, width: bitmap.width, height: bitmap.height, ext: keepExt };
    } else {
      full = await render(bitmap, MAX_SIDE, RESIZE_QUALITY);
    }
    const thumb = await render(bitmap, THUMB_SIDE, THUMB_QUALITY);

    const path = `projects/${projectId}/${id}.${full.ext}`;
    const thumbPath = `projects/${projectId}/thumbs/${id}.${thumb.ext}`;
    const [url, thumbUrl] = await Promise.all([
      put(path, full.blob.type ? full.blob : new Blob([full.blob], { type: file.type })),
      put(thumbPath, thumb.blob),
    ]);
    return {
      id,
      name: file.name,
      path,
      url,
      thumbPath,
      thumbUrl,
      width: full.width,
      height: full.height,
      size: full.blob.size,
    };
  } finally {
    bitmap.close?.();
  }
}

export async function deleteImageFiles(image) {
  const targets = [image.path, image.thumbPath].filter(Boolean);
  await Promise.allSettled(targets.map((p) => deleteObject(ref(storage, p))));
}

async function deleteFolder(folderRef) {
  const { items, prefixes } = await listAll(folderRef);
  await Promise.allSettled(items.map((i) => deleteObject(i)));
  await Promise.all(prefixes.map(deleteFolder));
}

/** Removes every file under projects/<id>/, including anything orphaned. */
export async function deleteProjectFiles(projectId) {
  await deleteFolder(ref(storage, `projects/${projectId}`));
}
