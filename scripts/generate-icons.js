/**
 * Generate PWA Icons Script
 *
 * This script creates app icons for the PWA.
 * For production, you should:
 * 1. Create a 1024x1024 PNG icon with your app logo
 * 2. Run: npx pwa-assets-generator --preset minimal your-icon.png public/
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')

// Create SVG icon (simple investment diary icon)
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#3b82f6" rx="100"/>
  <g fill="white">
    <!-- Book/Diary icon -->
    <rect x="120" y="100" width="272" height="312" rx="16" fill-opacity="0.9"/>
    <rect x="140" y="120" width="232" height="272" rx="8" fill="#3b82f6"/>
    <!-- Lines representing text -->
    <rect x="160" y="150" width="150" height="16" rx="8" fill="white" fill-opacity="0.9"/>
    <rect x="160" y="185" width="180" height="16" rx="8" fill="white" fill-opacity="0.9"/>
    <rect x="160" y="220" width="140" height="16" rx="8" fill="white" fill-opacity="0.9"/>
    <rect x="160" y="255" width="170" height="16" rx="8" fill="white" fill-opacity="0.9"/>
    <rect x="160" y="290" width="130" height="16" rx="8" fill="white" fill-opacity="0.9"/>
    <!-- Chart line -->
    <path d="M 160 340 L 220 320 L 280 345 L 340 300 L 370 280" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>
`

// Write SVG icon
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon.trim())
console.log('✅ Created icon.svg')

console.log('\n📋 Next steps to generate PNG icons:')
console.log('   npm install -D @vite-pwa/assets-generator')
console.log('   npx pwa-assets-generator --preset minimal public/icon.svg public/')
console.log('\n   Or use an online tool like:')
console.log('   https://realfavicongenerator.net/')
console.log('   https://www.pwabuilder.com/imageGenerator')
