// src/lib/chat/compress-image.ts
//
// Browser-side image compression for TissChat media relay.
// Resizes + compresses images to chat-friendly dimensions before upload.
// Runs off-main-thread where possible via OffscreenCanvas, falls back to <canvas>.
//
// Targets:
//   - Max dimension: 1600px (longest side)
//   - Output format: image/webp (fallback image/jpeg)
//   - Quality: 0.80
//   - Skip if already small enough (< 200 KB)

const MAX_DIMENSION = 1600;
const QUALITY = 0.80;
const SKIP_THRESHOLD = 200 * 1024; // 200 KB — already small enough

/**
 * Compress an image File for chat relay.
 * Returns the compressed File (may be the original if compression is unnecessary or fails).
 */
export async function compressChatImage(file: File): Promise<File> {
  // Only compress raster image types
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file; // GIFs lose animation — skip
  }

  // Already small — skip compression
  if (file.size <= SKIP_THRESHOLD) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    // Calculate scaled dimensions (keep aspect ratio, cap longest side)
    let targetW = width;
    let targetH = height;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height);
      targetW = Math.round(width * scale);
      targetH = Math.round(height * scale);
    } else if (file.size <= SKIP_THRESHOLD) {
      // Already under threshold and within dimension limits
      bitmap.close();
      return file;
    }

    // Prefer OffscreenCanvas (non-blocking), fall back to <canvas>
    let blob: Blob | null = null;

    if (typeof OffscreenCanvas !== 'undefined') {
      const oc = new OffscreenCanvas(targetW, targetH);
      const ctx = oc.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, targetW, targetH);
        blob = await oc.convertToBlob({ type: 'image/webp', quality: QUALITY });
        // Fallback if webp not supported by browser's OffscreenCanvas
        if (!blob || blob.size === 0) {
          blob = await oc.convertToBlob({ type: 'image/jpeg', quality: QUALITY });
        }
      }
    }

    if (!blob) {
      // Fallback: regular canvas (main thread, but fast for chat-sized images)
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close();
        return file;
      }
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/webp', QUALITY);
      });
      if (!blob || blob.size === 0) {
        blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/jpeg', QUALITY);
        });
      }
    }

    bitmap.close();

    if (!blob || blob.size === 0) {
      return file; // Compression failed — send original
    }

    // Only use compressed version if it's actually smaller
    if (blob.size >= file.size) {
      return file;
    }

    // Derive new filename: strip old extension, add webp/jpeg
    const ext = blob.type === 'image/webp' ? '.webp' : '.jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const compressedName = `${baseName}${ext}`;

    return new File([blob], compressedName, { type: blob.type });
  } catch {
    // Any error — send original uncompressed
    return file;
  }
}
