/**
 * copy-ui-kit.mjs
 *
 * Copies the Simple Pink UI kit SVG assets from the project root into
 * public/ui-kit/ so Vite can serve them at /ui-kit/...
 *
 * Run once after cloning:  npm run setup
 * Or automatically via postinstall if you uncomment that in package.json.
 */
import { cpSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const sources = [
  { from: 'UI PACK SVG', to: 'public/ui-kit' },
]

for (const { from, to } of sources) {
  const src  = join(ROOT, from)
  const dest = join(ROOT, to)

  if (!existsSync(src)) {
    console.warn(`[setup] Skipping "${from}" — folder not found.`)
    continue
  }

  mkdirSync(dest, { recursive: true })
  cpSync(src, dest, { recursive: true })
  console.log(`[setup] Copied "${from}" → "${to}"`)
}

console.log('[setup] Done. UI kit assets are ready at /ui-kit/')
