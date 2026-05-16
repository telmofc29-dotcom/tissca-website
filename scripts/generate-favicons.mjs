/**
 * generate-favicons.mjs
 * Generates clean, high-contrast favicon assets from the existing TISSCA logo mark.
 *
 * Approach:
 * 1. Extract the "T" shape from icon.png by isolating lighter pixels (the logo)
 * 2. Composite onto a solid deep navy background
 * 3. Boost contrast so it reads well at 16px
 * 4. Output: icon.png (512px), apple-icon.png (180px), favicon.ico (multi-res)
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const appDir = join(root, 'src', 'app');

const NAVY = { r: 11, g: 20, b: 27 }; // #0b141b — TISSCA deep navy
const SIZE_ICON = 512;
const SIZE_APPLE = 180;
const FAVICON_SIZES = [16, 32, 48];

async function generateCleanIcon(size) {
  // Read the original 512px icon
  const original = sharp(join(appDir, 'icon.png'));

  // Step 1: Extract the logo shape.
  // The original has a grey/silver "T" on a dark gradient.
  // We threshold to isolate the "T" as white, everything else as transparent.
  const rawBuffer = await original
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer();

  const pixels = rawBuffer.length / 4;
  const logoMask = Buffer.alloc(pixels * 4);

  for (let i = 0; i < pixels; i++) {
    const r = rawBuffer[i * 4];
    const g = rawBuffer[i * 4 + 1];
    const b = rawBuffer[i * 4 + 2];
    const a = rawBuffer[i * 4 + 3];

    // Luminance of pixel
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // The "T" logo pixels are brighter than the background.
    // Background is ~10-30 luminance, logo is ~100-180.
    // Use threshold of 60 to separate.
    if (lum > 60 && a > 128) {
      // Make the logo white with proportional opacity for anti-aliasing
      const intensity = Math.min(255, Math.round((lum - 60) / 120 * 255));
      logoMask[i * 4] = 255;     // R
      logoMask[i * 4 + 1] = 255; // G
      logoMask[i * 4 + 2] = 255; // B
      logoMask[i * 4 + 3] = Math.min(255, Math.round(intensity * (a / 255)));
    } else {
      logoMask[i * 4] = 0;
      logoMask[i * 4 + 1] = 0;
      logoMask[i * 4 + 2] = 0;
      logoMask[i * 4 + 3] = 0;
    }
  }

  // Step 2: Create solid navy background + composite white logo on top
  const logoLayer = await sharp(logoMask, {
    raw: { width: size, height: size, channels: 4 }
  }).png().toBuffer();

  const result = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: NAVY.r, g: NAVY.g, b: NAVY.b, alpha: 255 }
    }
  })
    .composite([{ input: logoLayer, blend: 'over' }])
    .png()
    .toBuffer();

  return result;
}

async function main() {
  console.log('Generating TISSCA favicon assets...\n');

  // 1. icon.png — 512×512 (main app icon for Next.js auto-detection)
  const icon512 = await generateCleanIcon(SIZE_ICON);
  writeFileSync(join(appDir, 'icon.png'), icon512);
  console.log(`✓ icon.png (${SIZE_ICON}×${SIZE_ICON}) → src/app/icon.png`);

  // 2. apple-icon.png — 180×180
  const iconApple = await generateCleanIcon(SIZE_APPLE);
  writeFileSync(join(appDir, 'apple-icon.png'), iconApple);
  console.log(`✓ apple-icon.png (${SIZE_APPLE}×${SIZE_APPLE}) → src/app/apple-icon.png`);

  // 3. favicon.ico — multi-resolution (16, 32, 48)
  // ICO format: we'll create individual PNGs at each size and pack them into ICO
  const icoBuffers = [];
  for (const s of FAVICON_SIZES) {
    const buf = await generateCleanIcon(s);
    icoBuffers.push({ size: s, buffer: buf });
    console.log(`  ✓ favicon layer ${s}×${s}`);
  }

  // Build ICO file (simple ICO format with PNG entries)
  const icoBuffer = buildIco(icoBuffers.map(b => ({ png: b.buffer, size: b.size })));
  writeFileSync(join(appDir, 'favicon.ico'), icoBuffer);
  console.log(`✓ favicon.ico (${FAVICON_SIZES.join(', ')}px) → src/app/favicon.ico`);

  console.log('\nDone! All favicon assets generated.');
}

/**
 * Build a minimal ICO file containing PNG-encoded images.
 * ICO format: 6-byte header + (16-byte entry per image) + PNG data blocks
 */
function buildIco(images) {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;
  const headerAndEntries = HEADER_SIZE + ENTRY_SIZE * images.length;

  let totalSize = headerAndEntries;
  for (const img of images) totalSize += img.png.length;

  const ico = Buffer.alloc(totalSize);

  // ICO Header (6 bytes)
  ico.writeUInt16LE(0, 0);              // Reserved
  ico.writeUInt16LE(1, 2);              // Type: 1 = ICO
  ico.writeUInt16LE(images.length, 4);  // Number of images

  let offset = headerAndEntries;

  for (let i = 0; i < images.length; i++) {
    const { png, size } = images[i];
    const entryOffset = HEADER_SIZE + i * ENTRY_SIZE;

    ico.writeUInt8(size >= 256 ? 0 : size, entryOffset);      // Width (0 = 256)
    ico.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1);   // Height (0 = 256)
    ico.writeUInt8(0, entryOffset + 2);                         // Color palette
    ico.writeUInt8(0, entryOffset + 3);                         // Reserved
    ico.writeUInt16LE(1, entryOffset + 4);                      // Color planes
    ico.writeUInt16LE(32, entryOffset + 6);                     // Bits per pixel
    ico.writeUInt32LE(png.length, entryOffset + 8);             // Size of PNG data
    ico.writeUInt32LE(offset, entryOffset + 12);                // Offset to PNG data

    png.copy(ico, offset);
    offset += png.length;
  }

  return ico;
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
