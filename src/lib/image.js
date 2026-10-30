import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../firebase.js';

// 4K (UHD) long side. Larger originals are scaled down before upload; smaller ones are kept as-is.
export const MAX_SIDE = 3840;
export const THUMB_SIDE = 900;

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
    const full = await render(bitmap, MAX_SIDE, 0.9);
    const thumb = await render(bitmap, THUMB_SIDE, 0.8);
    const path = `projects/${projectId}/${id}.${full.ext}`;
    const thumbPath = `projects/${projectId}/thumbs/${id}.${thumb.ext}`;
    const [url, thumbUrl] = await Promise.all([put(path, full.blob), put(thumbPath, thumb.blob)]);
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
