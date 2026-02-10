/**
 * Generate PNG Icons from SVG
 * Creates icons in multiple sizes for PWA
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')
const svgPath = path.join(publicDir, 'icon.svg')

const sizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 512, name: 'icon-maskable-512x512.png', maskable: true }
]

async function generateIcons() {
  try {
    // Check if SVG exists
    if (!fs.existsSync(svgPath)) {
      console.error('❌ icon.svg not found. Run generate-icons.js first.')
      process.exit(1)
    }

    console.log('🎨 Generating PNG icons from SVG...\n')

    for (const { size, name, maskable } of sizes) {
      const outputPath = path.join(publicDir, name)

      // For maskable icons, we need to add padding (10% on each side)
      const padding = Math.floor(size * 0.1)
      const safeSize = size - (padding * 2)

      let pipeline = sharp(svgPath)
        .resize(Math.floor(safeSize), Math.floor(safeSize), { fit: 'cover', background: { r: 0, g: 0, b: 0, alpha: 0 } })

      if (maskable) {
        pipeline = pipeline.extend({
          top: Math.floor(padding),
          bottom: Math.floor(padding),
          left: Math.floor(padding),
          right: Math.floor(padding),
          background: { r: 59, g: 130, b: 246, alpha: 1 } // #3b82f6
        })
      }

      await pipeline.png().toFile(outputPath)
      console.log(`✅ Generated ${name} (${size}x${size}${maskable ? ' maskable' : ''})`)
    }

    console.log('\n✨ All icons generated successfully!')
  } catch (error) {
    console.error('❌ Error generating icons:', error.message)
    process.exit(1)
  }
}

generateIcons()
