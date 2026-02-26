import sharp from 'sharp'
import { writeFileSync } from 'fs'

const SRC = 'public/icons/source-icon.png'

const SIZES = [
  { size: 180, name: 'apple-touch-icon' },
  { size: 192, name: 'icon-192' },
  { size: 512, name: 'icon-512' },
]

// Rounded-rect SVG mask — clips white corners to transparent.
// iOS standard corner radius is ~22.37% of icon size.
function mask(size) {
  const r = Math.round(size * 0.2237)
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="white"/>` +
    `</svg>`
  )
}

for (const { size, name } of SIZES) {
  await sharp(SRC)
    .resize(size, size, { fit: 'cover' })
    .ensureAlpha()
    .composite([{ input: mask(size), blend: 'dest-in' }])
    .png()
    .toFile(`public/icons/${name}.png`)
  console.log(`✓  ${name}.png  (${size}×${size})`)
}

console.log('\nDone! Three icon files written to public/icons/')
