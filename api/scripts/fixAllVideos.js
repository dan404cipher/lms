const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the bundled ffmpeg
let ffmpegPath;
try {
  ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  console.log('✅ Using bundled ffmpeg:', ffmpegPath);
} catch (e) {
  console.error('❌ ffmpeg not found. Please install: npm install @ffmpeg-installer/ffmpeg');
  process.exit(1);
}

const recordingsDir = path.join(__dirname, '../recordings');
const backupDir = path.join(__dirname, '../recordings_backup');

// Create backup directory
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('🔧 Converting ALL Zoom recordings to browser-compatible format...');
console.log('📁 Processing directory:', recordingsDir);
console.log('');

const files = fs.readdirSync(recordingsDir).filter(f => f.endsWith('.mp4') && !f.endsWith('_web.mp4'));

let total = 0;
let converted = 0;
let failed = 0;
let skipped = 0;

for (const filename of files) {
  total++;
  const inputPath = path.join(recordingsDir, filename);
  const backupPath = path.join(backupDir, filename);
  const tempPath = path.join(recordingsDir, filename.replace('.mp4', '_web.mp4'));

  console.log(`\n[${total}/${files.length}] 📹 Processing: ${filename}`);
  
  try {
    // Backup original
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(inputPath, backupPath);
      console.log('   💾 Backed up to:', path.basename(backupPath));
    }
    
    const stats = fs.statSync(inputPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   📊 Original size: ${sizeMB}MB`);
    
    // Convert to browser-compatible format
    console.log('   🎬 Converting to web format...');
    execSync(
      `"${ffmpegPath}" -i "${inputPath}" -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${tempPath}" -y`,
      { stdio: 'pipe', maxBuffer: 100 * 1024 * 1024 }
    );
    
    // Replace original with converted
    fs.unlinkSync(inputPath);
    fs.renameSync(tempPath, inputPath);
    
    const newStats = fs.statSync(inputPath);
    const newSizeMB = (newStats.size / 1024 / 1024).toFixed(2);
    
    converted++;
    console.log(`   ✅ Converted! New size: ${newSizeMB}MB`);
    
  } catch (error) {
    failed++;
    console.error(`   ❌ Failed:`, error.message);
    
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log('📊 CONVERSION SUMMARY:');
console.log('='.repeat(60));
console.log(`   Total videos: ${total}`);
console.log(`   ✅ Converted: ${converted}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   ⏭️  Skipped: ${skipped}`);
console.log(`   💾 Backups saved to: ${backupDir}`);
console.log('='.repeat(60));

if (converted > 0) {
  console.log('\n✨ Done! Refresh your browser and all videos should now play.');
} else {
  console.log('\n⚠️  No videos were converted.');
}

