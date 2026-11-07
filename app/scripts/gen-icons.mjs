// Génère les icônes PNG de la PWA (carré arrondi indigo + "V" blanc, 5x7 pixel font).
// Usage : node scripts/gen-icons.mjs  -> app/static/icons/*.png
import zlib from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../static/icons');
mkdirSync(outDir, { recursive: true });

// --- encodeur PNG minimal ---
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// --- dessin ---
const BG = [0x63, 0x66, 0xf1, 0xff]; // #6366f1
const FG = [0xff, 0xff, 0xff, 0xff];
const TRANSPARENT = [0, 0, 0, 0];

const V_FONT = [
  'V...V',
  'V...V',
  'V...V',
  'V...V',
  '.V.V.',
  '.V.V.',
  '..V..'
];

function drawIcon(size, maskable) {
  const px = Buffer.alloc(size * size * 4);
  const radius = maskable ? 0 : size * 0.18; // maskable = plein cadre (safe zone gérée par l'OS)
  const m = maskable ? size * 0.1 : 0; // marge pour maskable
  const fontScale = Math.floor((size - 2 * m) / 12); // 5x7 font ~ largeur 5*scale, hauteur 7*scale
  const fw = 5 * fontScale;
  const fh = 7 * fontScale;
  const ox = Math.floor((size - fw) / 2);
  const oy = Math.floor((size - fh) / 2);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // carré arrondi
      let inside = x >= m && x < size - m && y >= m && y < size - m;
      if (inside && radius > 0) {
        const cx = Math.min(Math.max(x, m + radius), size - m - radius - 1);
        const cy = Math.min(Math.max(y, m + radius), size - m - radius - 1);
        const dx = x - cx;
        const dy = y - cy;
        inside = dx * dx + dy * dy <= radius * radius || (x >= m + radius && x < size - m - radius) || (y >= m + radius && y < size - m - radius);
        // coins arrondis uniquement
        const inCore = x >= m + radius && x < size - m - radius && y >= m + radius && y < size - m - radius;
        const inBandX = x >= m + radius && x < size - m - radius;
        const inBandY = y >= m + radius && y < size - m - radius;
        inside = inCore || inBandX || inBandY || (dx * dx + dy * dy <= radius * radius && x >= m && x < size - m && y >= m && y < size - m && !(x < m + radius && y < m + radius) && !(x >= size - m - radius && y < m + radius) && !(x < m + radius && y >= size - m - radius) && !(x >= size - m - radius && y >= size - m - radius));
      }
      if (!inside) {
        px.set(TRANSPARENT, i);
        continue;
      }
      // lettre V
      const fx = x - ox;
      const fy = y - oy;
      const isLetter = fx >= 0 && fx < fw && fy >= 0 && fy < fh && V_FONT[Math.floor(fy / fontScale)]?.[Math.floor(fx / fontScale)] === 'V';
      px.set(isLetter ? FG : BG, i);
    }
  }
  return encodePNG(size, size, px);
}

writeFileSync(path.join(outDir, 'icon-192.png'), drawIcon(192, false));
writeFileSync(path.join(outDir, 'icon-512.png'), drawIcon(512, false));
writeFileSync(path.join(outDir, 'icon-maskable-512.png'), drawIcon(512, true));
console.log('[gen-icons] icônes écrites dans', outDir);
