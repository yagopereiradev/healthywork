// Generates the favicon and every PWA icon from the logo geometry below.
// Run with `npm run icons` and commit the result: the build never needs sharp.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WATER = '#17707C';
const WHITE = '#FFFFFF';

// The mark: a white drop with a check, on the water colour. Drawn on a 64 x 64 grid.
const DROP = 'M32 11 C32 11 17 27 17 38 a15 15 0 0 0 30 0 C47 27 32 11 32 11Z';
const CHECK = 'M24 39 l6 6 l11 -12';

/**
 * @param {{ rounded: boolean, scale?: number }} options
 *   rounded: rounded square on a transparent canvas (favicon, regular icons).
 *   Otherwise the colour fills the canvas and the OS applies its own mask.
 *   scale: size of the drop relative to the canvas, for mask-safe zones.
 */
function logoSvg({ rounded, scale = 1 }) {
  const transform =
    scale === 1 ? '' : ` transform="translate(32 32) scale(${scale}) translate(-32 -32)"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64"${rounded ? ' rx="18"' : ''} fill="${WATER}"/>
  <g${transform}>
    <path d="${DROP}" fill="${WHITE}"/>
    <path d="${CHECK}" fill="none" stroke="${WATER}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;
}

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
await mkdir(publicDir, { recursive: true });

const rounded = logoSvg({ rounded: true });
await writeFile(`${publicDir}favicon.svg`, rounded);

const pngs = [
  { file: 'pwa-192x192.png', size: 192, svg: rounded },
  { file: 'pwa-512x512.png', size: 512, svg: rounded },
  // Maskable: the drop stays inside the central 80% that every mask shape keeps.
  { file: 'maskable-icon-512x512.png', size: 512, svg: logoSvg({ rounded: false, scale: 0.74 }) },
  // iOS and macOS round the corners themselves and do not support transparency.
  { file: 'apple-touch-icon-180x180.png', size: 180, svg: logoSvg({ rounded: false, scale: 0.9 }) },
];

for (const { file, size, svg } of pngs) {
  await sharp(Buffer.from(svg), { density: 72 * (size / 64) * 2 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(`${publicDir}${file}`);
  console.log(`public/${file}`);
}
console.log('public/favicon.svg');

// favicon.ico holds the 16, 32 and 48 pixel versions. The .ico container is
// simple enough to write by hand: a 6-byte header, one 16-byte entry per image,
// then the images themselves, which may be plain PNG files.
const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(
  icoSizes.map((size) =>
    sharp(Buffer.from(rounded), { density: 72 * (size / 64) * 4 })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toBuffer(),
  ),
);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // 1 = icon
header.writeUInt16LE(icoImages.length, 4);
let offset = header.length + 16 * icoImages.length;
const entries = icoImages.map((image, index) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(icoSizes[index], 0); // width
  entry.writeUInt8(icoSizes[index], 1); // height
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(image.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += image.length;
  return entry;
});
await writeFile(`${publicDir}favicon.ico`, Buffer.concat([header, ...entries, ...icoImages]));
console.log('public/favicon.ico');
