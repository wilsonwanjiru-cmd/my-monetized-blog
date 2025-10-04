const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create a 1200x630 canvas (OG image standard size)
const width = 1200;
const height = 630;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Background gradient
const gradient = ctx.createLinearGradient(0, 0, width, height);
gradient.addColorStop(0, '#667eea');
gradient.addColorStop(1, '#764ba2');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);

// Add decorative elements
ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
for (let i = 0; i < 5; i++) {
  ctx.beginPath();
  ctx.arc(
    Math.random() * width,
    Math.random() * height,
    Math.random() * 100 + 50,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

// Main title
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 72px "Arial"';
ctx.textAlign = 'center';
ctx.fillText("Wilson's Blog", width / 2, height / 2 - 60);

// Subtitle
ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
ctx.font = '36px "Arial"';
ctx.fillText('Quality Content & Smart Monetization', width / 2, height / 2 + 30);

// URL/Brand
ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
ctx.font = '24px "Arial"';
ctx.fillText('wilsonblog.com', width / 2, height - 80);

// Bottom accent
ctx.fillStyle = '#ff6b6b';
ctx.fillRect(0, height - 10, width, 10);

// Save the image
const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
const outputPath = path.join(__dirname, '../frontend/public/default-og-image.jpg');

// Ensure the directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, buffer);
console.log('✅ Professional OG image generated:', outputPath);
console.log('📐 Dimensions: 1200x630px');
console.log('🎨 Format: JPEG (High Quality)');