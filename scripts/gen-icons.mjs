// Maakt de app-iconen (PNG) zonder extra pakketten. Start met: npm run icons
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const SS = 4; // supersampling voor zachte randen
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const [pr, pg, pb, pa] = pixel((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size);
        r += pr * pa; g += pg * pa; b += pb * pa; a += pa;
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = a ? r / a : 0; raw[o + 1] = a ? g / a : 0; raw[o + 2] = a ? b / a : 0; raw[o + 3] = (a / (SS * SS)) * 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const PURPLE = [91, 61, 245], WHITE = [255, 255, 255], COIN = [245, 177, 0], COIN_DARK = [214, 140, 0];
function design(full) {
  // full = maskable: achtergrond tot de rand, inhoud kleiner (veilige zone)
  const s = full ? 0.78 : 1, off = (1 - s) / 2;
  return (u, v) => {
    if (!full) {
      const r = 0.22, dx = Math.max(r - u, 0, u - (1 - r)), dy = Math.max(r - v, 0, v - (1 - r));
      if (dx * dx + dy * dy > r * r) return [0, 0, 0, 0];
    }
    const x = (u - off) / s, y = (v - off) / s;
    // munt rechtsonder
    const cdx = x - 0.7, cdy = y - 0.7, cd = Math.hypot(cdx, cdy);
    if (cd < 0.2) return cd < 0.14 ? [...COIN, 1] : [...COIN_DARK, 1];
    // wit plusteken linksboven
    const px = 0.38, py = 0.38, arm = 0.2, th = 0.075;
    if ((Math.abs(x - px) < th && Math.abs(y - py) < arm) || (Math.abs(y - py) < th && Math.abs(x - px) < arm)) return [...WHITE, 1];
    return [...PURPLE, 1];
  };
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, design(false)));
writeFileSync('public/icons/icon-512.png', png(512, design(false)));
writeFileSync('public/icons/icon-maskable-512.png', png(512, design(true)));
writeFileSync('public/icons/apple-touch-icon.png', png(180, design(true)));
console.log('Iconen gemaakt in public/icons/');
