const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Base SVG representing the official Feira Fácil icon
const getSvgIcon = (options = {}) => {
  const { isMaskable = false, isSplash = false, width = 512, height = 512 } = options;
  
  // Scale factor & padding
  const padding = isMaskable ? 0.2 : 0.08; // maskable safe area
  const contentScale = isSplash ? 0.35 : (1 - padding * 2);
  const tx = isSplash ? (width / 2) - (48 * 4 * contentScale / 2) : width * padding;
  const ty = isSplash ? (height / 2) - (48 * 4 * contentScale / 2) - 40 : height * padding;
  const baseSize = 48;
  const scale = (width * contentScale) / baseSize;

  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#0284c7"/>
        <stop offset="50%" stop-color="#0ea5e9"/>
        <stop offset="100%" stop-color="#06b6d4"/>
      </linearGradient>

      <linearGradient id="splashBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0284c7"/>
        <stop offset="100%" stop-color="#0369a1"/>
      </linearGradient>

      <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0369a1" flood-opacity="0.35"/>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="${width}" height="${height}" fill="${isSplash ? 'url(#splashBg)' : 'url(#bgGrad)'}" />

    <!-- Main Shopping Cart Icon Group -->
    <g transform="translate(${tx}, ${ty}) scale(${scale})" filter="url(#dropShadow)">
      <!-- Groceries inside Cart -->
      <!-- Green base / Apple -->
      <path d="M17 18C17 14.5 19.5 12 23 12C26.5 12 29 14.5 29 18H17Z" fill="#34D399" />
      
      <!-- Yellow Star / Fresh Fruit -->
      <path d="M27 18C27 13.5 30 11 34 11C38 11 40 14 39 18H27Z" fill="#FBBF24" />
      
      <!-- Red Cherry with green stem -->
      <circle cx="23" cy="11" r="2.5" fill="#EF4444" />
      <path d="M23 8.5C23.5 7 25 6 26.5 6" stroke="#10B981" stroke-width="2" stroke-linecap="round" fill="none" />

      <!-- Yellow star accent -->
      <path d="M39 7L40.5 10.5L44 12L40.5 13.5L39 17L37.5 13.5L34 12L37.5 10.5L39 7Z" fill="#FDE047" />

      <!-- Cart Wireframe and Base -->
      <path 
        d="M8 12H13.5L18.2 27.5C18.6 28.8 19.8 29.8 21.2 29.8H36.8C38.2 29.8 39.4 28.8 39.8 27.5L43 17H15" 
        stroke="white" 
        stroke-width="3.6" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        fill="none"
      />
      <!-- Cart Inner Grid Lines -->
      <path d="M20 19H40" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.85" />
      <path d="M22 25H38" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.85" />
      <path d="M26 17V29" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.85" />
      <path d="M33 17V29" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.85" />

      <!-- Cart Wheels -->
      <circle cx="21.5" cy="38.5" r="3.5" fill="white" />
      <circle cx="21.5" cy="38.5" r="1.5" fill="#0284C7" />
      
      <circle cx="36.5" cy="38.5" r="3.5" fill="white" />
      <circle cx="36.5" cy="38.5" r="1.5" fill="#0284C7" />
    </g>

    ${isSplash ? `
      <!-- Splash Screen Title -->
      <text 
        x="${width / 2}" 
        y="${(height / 2) + 120}" 
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-size="44" 
        font-weight="900" 
        fill="white" 
        text-anchor="middle" 
        letter-spacing="0.5"
      >Feira Fácil</text>
      <text 
        x="${width / 2}" 
        y="${(height / 2) + 160}" 
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-size="18" 
        font-weight="600" 
        fill="#bae6fd" 
        text-anchor="middle" 
        letter-spacing="1.5"
      >SUPERMERCADO INTELIGENTE</text>
    ` : ''}
  </svg>
  `;
};

async function generateAllAssets() {
  console.log('Generating official Feira Fácil application assets...');

  // Ensure directories exist
  const dirs = [
    'public',
    'android/app/src/main/res/mipmap-mdpi',
    'android/app/src/main/res/mipmap-hdpi',
    'android/app/src/main/res/mipmap-xhdpi',
    'android/app/src/main/res/mipmap-xxhdpi',
    'android/app/src/main/res/mipmap-xxxhdpi',
    'android/app/src/main/res/drawable',
    'android/app/src/main/res/drawable-port-mdpi',
    'android/app/src/main/res/drawable-port-hdpi',
    'android/app/src/main/res/drawable-port-xhdpi',
    'android/app/src/main/res/drawable-port-xxhdpi',
    'android/app/src/main/res/drawable-port-xxxhdpi',
    'android/app/src/main/res/drawable-land-mdpi',
    'android/app/src/main/res/drawable-land-hdpi',
    'android/app/src/main/res/drawable-land-xhdpi',
    'android/app/src/main/res/drawable-land-xxhdpi',
    'android/app/src/main/res/drawable-land-xxxhdpi',
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // 1. Web SVG Favicon & Icons
  const baseSvg = getSvgIcon({ width: 512, height: 512 });
  fs.writeFileSync('public/favicon.svg', baseSvg);
  fs.writeFileSync('public/icon.svg', baseSvg);

  // 2. Web PNG Icons
  await sharp(Buffer.from(baseSvg)).resize(512, 512).png().toFile('public/pwa-512x512.png');
  await sharp(Buffer.from(baseSvg)).resize(192, 192).png().toFile('public/pwa-192x192.png');
  await sharp(Buffer.from(baseSvg)).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  await sharp(Buffer.from(baseSvg)).resize(64, 64).png().toFile('public/favicon.png');
  await sharp(Buffer.from(baseSvg)).resize(512, 512).png().toFile('public/app-logo.png');

  // Maskable icon with safe margins
  const maskableSvg = getSvgIcon({ width: 512, height: 512, isMaskable: true });
  await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile('public/pwa-maskable-512x512.png');

  // 3. Android Mipmap Icons
  const mipmapSizes = [
    { dir: 'android/app/src/main/res/mipmap-mdpi', size: 48, fgSize: 108 },
    { dir: 'android/app/src/main/res/mipmap-hdpi', size: 72, fgSize: 162 },
    { dir: 'android/app/src/main/res/mipmap-xhdpi', size: 96, fgSize: 216 },
    { dir: 'android/app/src/main/res/mipmap-xxhdpi', size: 144, fgSize: 324 },
    { dir: 'android/app/src/main/res/mipmap-xxxhdpi', size: 192, fgSize: 432 }
  ];

  for (const m of mipmapSizes) {
    // Standard launcher icon
    await sharp(Buffer.from(baseSvg)).resize(m.size, m.size).png().toFile(path.join(m.dir, 'ic_launcher.png'));
    
    // Rounded launcher icon (with circular mask)
    const circleMask = Buffer.from(
      `<svg width="${m.size}" height="${m.size}"><circle cx="${m.size/2}" cy="${m.size/2}" r="${m.size/2}" fill="white"/></svg>`
    );
    await sharp(Buffer.from(baseSvg))
      .resize(m.size, m.size)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(m.dir, 'ic_launcher_round.png'));

    // Adaptive icon foreground
    const fgSvg = getSvgIcon({ width: m.fgSize, height: m.fgSize, isMaskable: true });
    await sharp(Buffer.from(fgSvg)).resize(m.fgSize, m.fgSize).png().toFile(path.join(m.dir, 'ic_launcher_foreground.png'));
  }

  // 4. Android Splash Screen Images (Portrait & Landscape)
  const splashPortSizes = [
    { dir: 'android/app/src/main/res/drawable', width: 480, height: 800 },
    { dir: 'android/app/src/main/res/drawable-port-mdpi', width: 320, height: 480 },
    { dir: 'android/app/src/main/res/drawable-port-hdpi', width: 480, height: 800 },
    { dir: 'android/app/src/main/res/drawable-port-xhdpi', width: 720, height: 1280 },
    { dir: 'android/app/src/main/res/drawable-port-xxhdpi', width: 960, height: 1600 },
    { dir: 'android/app/src/main/res/drawable-port-xxxhdpi', width: 1280, height: 1920 }
  ];

  for (const s of splashPortSizes) {
    const splashSvg = getSvgIcon({ width: s.width, height: s.height, isSplash: true });
    await sharp(Buffer.from(splashSvg)).resize(s.width, s.height).png().toFile(path.join(s.dir, 'splash.png'));
  }

  const splashLandSizes = [
    { dir: 'android/app/src/main/res/drawable-land-mdpi', width: 480, height: 320 },
    { dir: 'android/app/src/main/res/drawable-land-hdpi', width: 800, height: 480 },
    { dir: 'android/app/src/main/res/drawable-land-xhdpi', width: 1280, height: 720 },
    { dir: 'android/app/src/main/res/drawable-land-xxhdpi', width: 1600, height: 960 },
    { dir: 'android/app/src/main/res/drawable-land-xxxhdpi', width: 1920, height: 1280 }
  ];

  for (const s of splashLandSizes) {
    const splashSvg = getSvgIcon({ width: s.width, height: s.height, isSplash: true });
    await sharp(Buffer.from(splashSvg)).resize(s.width, s.height).png().toFile(path.join(s.dir, 'splash.png'));
  }

  console.log('All Feira Fácil icons and splash assets successfully generated!');
}

generateAllAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
