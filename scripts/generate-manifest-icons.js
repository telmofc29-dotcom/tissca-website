const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'app', 'icon.png');
const outDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const sizes = [192, 512, 384, 256, 128, 96, 72, 48];

async function main() {
  for (const s of sizes) {
    await sharp(src)
      .resize(s, s, { fit: 'contain', background: { r: 11, g: 20, b: 27, alpha: 1 } })
      .png()
      .toFile(path.join(outDir, `icon-${s}x${s}.png`));
    console.log(`  ok icon-${s}x${s}.png`);
  }

  // Maskable 512 (logo in 80% safe zone)
  await sharp(src)
    .resize(384, 384, { fit: 'contain', background: { r: 11, g: 20, b: 27, alpha: 1 } })
    .extend({ top: 64, bottom: 64, left: 64, right: 64, background: { r: 11, g: 20, b: 27, alpha: 1 } })
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-maskable-512x512.png'));
  console.log('  ok icon-maskable-512x512.png');

  // Maskable 192
  await sharp(src)
    .resize(144, 144, { fit: 'contain', background: { r: 11, g: 20, b: 27, alpha: 1 } })
    .extend({ top: 24, bottom: 24, left: 24, right: 24, background: { r: 11, g: 20, b: 27, alpha: 1 } })
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, 'icon-maskable-192x192.png'));
  console.log('  ok icon-maskable-192x192.png');

  console.log('\nAll manifest icons generated.');
}

main().catch(e => { console.error(e); process.exit(1); });
