import sharp from 'sharp'
import { sharpsToIco } from 'sharp-ico'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const jpgSource = path.join(rootDir, 'public', 'icon.jpg')
const svgSource = path.join(rootDir, 'public', 'icon.svg')
const sourcePath = fs.existsSync(jpgSource) ? jpgSource : svgSource

const sizes = [
  { size: 16, output: 'public/favicon-16x16.png' },
  { size: 32, output: 'public/favicon-32x32.png' },
  { size: 180, output: 'public/apple-touch-icon.png' },
  { size: 192, output: 'public/icon-192x192.png' },
  { size: 512, output: 'public/icon-512x512.png' },
  { size: 512, output: 'public/icon-maskable-512x512.png' }
]

console.log(`Generating icons from ${path.relative(rootDir, sourcePath)}...`)

for (const { size, output } of sizes) {
  await sharp(sourcePath)
    .resize(size, size)
    .png()
    .toFile(output)
  console.log(`✓ Generated ${output}`)
}

// Generate favicon.ico (multiple sizes in one file)
const faviconSizes = [32, 64, 128]
const faviconSharps = []

for (const size of faviconSizes) {
  const sharpInstance = sharp(sourcePath)
    .resize(size, size)
    .png()
  faviconSharps.push(sharpInstance)
}

await sharpsToIco(faviconSharps, 'public/favicon.ico')
console.log('✓ Generated public/favicon.ico')

console.log('Done!')
