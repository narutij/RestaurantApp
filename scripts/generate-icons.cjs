const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const logoPath = path.join(__dirname, '../client/public/icons/vilko_puota.png');
const outputDir = path.join(__dirname, '../client/public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [192, 512];

async function generateIcons() {
  for (const size of sizes) {
    await sharp(logoPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 45, g: 45, b: 45, alpha: 1 } // Dark background matching the logo
      })
      .png()
      .toFile(path.join(outputDir, `icon-${size}.png`));

    console.log(`Generated icon-${size}.png`);
  }

  // Also generate apple-touch-icon
  await sharp(logoPath)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 45, g: 45, b: 45, alpha: 1 }
    })
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));

  console.log('Generated apple-touch-icon.png');
  console.log('Done!');
}

generateIcons().catch(console.error);
