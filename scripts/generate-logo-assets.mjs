import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// SVG logo content
const logoSvg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradientBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1E40AF;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="gradientPurple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6D28D9;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15"/>
    </filter>
  </defs>
  <circle cx="100" cy="100" r="95" fill="white" stroke="#E5E7EB" stroke-width="2"/>
  <rect x="50" y="50" width="100" height="100" rx="12" fill="url(#gradientBlue)" filter="url(#shadow)"/>
  <circle cx="140" cy="75" r="18" fill="url(#gradientPurple)" opacity="0.9"/>
  <g transform="translate(100, 100)">
    <text x="-15" y="8" font-size="48" font-weight="700" fill="white" font-family="Arial, sans-serif" letter-spacing="-1">J</text>
    <text x="12" y="8" font-size="48" font-weight="700" fill="white" font-family="Arial, sans-serif" letter-spacing="-1">C</text>
  </g>
  <line x1="55" y1="165" x2="145" y2="165" stroke="url(#gradientPurple)" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
</svg>`;

const faviconSvg = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fav-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1E40AF;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="8" fill="url(#fav-gradient)"/>
  <text x="32" y="42" font-size="32" font-weight="700" fill="white" font-family="Arial, sans-serif" text-anchor="middle">JC</text>
</svg>`;

async function generateAssets() {
  console.log('🎨 Generating logo assets...\n');

  const assetsDir = path.join(__dirname, '..', 'src', 'assets');
  const publicDir = path.join(__dirname, '..', 'public');

  // Ensure directories exist
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  try {
    // Generate PNG logos
    console.log('📦 Creating PNG logos...');
    
    // Large logo (512x512)
    await sharp(Buffer.from(logoSvg))
      .png()
      .resize(512, 512)
      .toFile(path.join(assetsDir, 'jc-hub-logo.png'));
    console.log('✅ jc-hub-logo.png (512x512)');

    // Medium logo (256x256)
    await sharp(Buffer.from(logoSvg))
      .png()
      .resize(256, 256)
      .toFile(path.join(assetsDir, 'jc-hub-logo-256.png'));
    console.log('✅ jc-hub-logo-256.png (256x256)');

    // Small logo (128x128)
    await sharp(Buffer.from(logoSvg))
      .png()
      .resize(128, 128)
      .toFile(path.join(assetsDir, 'jc-hub-logo-128.png'));
    console.log('✅ jc-hub-logo-128.png (128x128)');

    // Generate favicon
    console.log('\n🎯 Creating favicon...');
    
    // Favicon PNG (32x32)
    await sharp(Buffer.from(faviconSvg))
      .png()
      .resize(32, 32)
      .toFile(path.join(publicDir, 'favicon-32x32.png'));
    console.log('✅ favicon-32x32.png');

    // Favicon PNG (16x16)
    await sharp(Buffer.from(faviconSvg))
      .png()
      .resize(16, 16)
      .toFile(path.join(publicDir, 'favicon-16x16.png'));
    console.log('✅ favicon-16x16.png');

    // Apple touch icon
    await sharp(Buffer.from(logoSvg))
      .png()
      .resize(180, 180)
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✅ apple-touch-icon.png (180x180)');

    // Android chrome icon
    await sharp(Buffer.from(logoSvg))
      .png()
      .resize(192, 192)
      .toFile(path.join(publicDir, 'android-chrome-192x192.png'));
    console.log('✅ android-chrome-192x192.png');

    // Large Android chrome icon
    await sharp(Buffer.from(logoSvg))
      .png()
      .resize(512, 512)
      .toFile(path.join(publicDir, 'android-chrome-512x512.png'));
    console.log('✅ android-chrome-512x512.png');

    console.log('\n✅ All assets generated successfully!');
    console.log(`📁 Assets location: ${assetsDir}`);
    console.log(`📁 Public assets location: ${publicDir}`);

  } catch (error) {
    console.error('❌ Error generating assets:', error.message);
    process.exit(1);
  }
}

generateAssets();
