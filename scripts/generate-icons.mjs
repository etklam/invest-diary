import sharp from 'sharp'
import { sharpsToIco } from 'sharp-ico'

const sizes = [
  { size: 192, output: 'public/icon-192x192.png' },
  { size: 512, output: 'public/icon-512x512.png' },
  { size: 512, output: 'public/icon-maskable-512x512.png' }
]

console.log('Generating icons from SVG...')

for (const { size, output } of sizes) {
  await sharp('public/icon.svg')
    .resize(size, size)
    .png()
    .toFile(output)
  console.log(`✓ Generated ${output}`)
}

// Generate favicon.ico (multiple sizes in one file)
const faviconSizes = [32, 64, 128]
const faviconSharps = []

for (const size of faviconSizes) {
  const sharpInstance = sharp('public/icon.svg')
    .resize(size, size)
    .png()
  faviconSharps.push(sharpInstance)
}

await sharpsToIco(faviconSharps, 'public/favicon.ico')
console.log('✓ Generated public/favicon.ico')

console.log('Done!')
