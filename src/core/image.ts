/** Longest edge of the stored image, in CSS pixels. */
const MAX_EDGE = 640;
const QUALITY = 0.8;

/**
 * Shrink a user-picked image file and return it as a data URL, so the card
 * carries its picture inline and rides along with the JSON backup and Drive
 * sync without a separate blob store.
 */
export async function fileToImageDataUrl(file: Blob, maxEdge = MAX_EDGE): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return canvas.toDataURL('image/webp', QUALITY);
}
