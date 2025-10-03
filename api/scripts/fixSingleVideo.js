const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Fix a single video file for web browser compatibility
const videoFileName = '16c07b28-b591-4a71-8323-7e18dfb7b3d0_1759507644797.mp4';
const recordingsDir = path.join(__dirname, '../recordings');
const inputPath = path.join(recordingsDir, videoFileName);
const outputPath = path.join(recordingsDir, videoFileName + '.fixed.mp4');
const backupPath = path.join(recordingsDir, videoFileName + '.backup');

console.log('🔧 Fixing video file for web browser...');
console.log('Input:', inputPath);

// Check if file exists
if (!fs.existsSync(inputPath)) {
  console.error('❌ Video file not found:', inputPath);
  process.exit(1);
}

// Backup original
console.log('💾 Creating backup...');
fs.copyFileSync(inputPath, backupPath);

// Try using AtomicParsley if available
try {
  console.log('🎬 Attempting to fix with AtomicParsley...');
  execSync(`AtomicParsley "${inputPath}" --overWrite`, { stdio: 'inherit' });
  console.log('✅ Fixed with AtomicParsley!');
  process.exit(0);
} catch (e) {
  console.log('⚠️  AtomicParsley not available, trying other methods...');
}

// Try using ffmpeg if available
try {
  console.log('🎬 Checking for ffmpeg...');
  execSync('which ffmpeg', { stdio: 'pipe' });
  console.log('📹 Using ffmpeg to fix video...');
  execSync(`ffmpeg -i "${inputPath}" -c copy -movflags +faststart "${outputPath}" -y`, { 
    stdio: 'inherit',
    maxBuffer: 10 * 1024 * 1024 
  });
  
  // Replace original with fixed version
  fs.unlinkSync(inputPath);
  fs.renameSync(outputPath, inputPath);
  
  console.log('✅ Video fixed successfully!');
  console.log('🎉 Refresh your browser and try playing the video again.');
  process.exit(0);
} catch (e) {
  console.log('⚠️  ffmpeg not available');
}

// Last resort: Read and rewrite the MP4 structure manually
console.log('📝 Using Node.js to fix MP4 structure...');
try {
  const buffer = fs.readFileSync(inputPath);
  
  // Simple check: if moov atom is near the beginning (within first 10% of file), it's probably fine
  const tenPercent = Math.floor(buffer.length * 0.1);
  const moovIndex = buffer.indexOf(Buffer.from('moov'));
  
  if (moovIndex > 0 && moovIndex < tenPercent) {
    console.log('✅ Video structure looks OK (moov at position', moovIndex, ')');
    console.log('⚠️  The issue might be codec-related.');
    console.log('');
    console.log('💡 Try opening the Zoom play URL instead:');
    console.log('   Check the browser console for "playUrl" field');
    process.exit(0);
  }
  
  console.log('🔍 Found moov atom at position:', moovIndex, '/', buffer.length);
  console.log('⚠️  This video needs ffmpeg to fix properly.');
  console.log('');
  console.log('🛠️  Please install ffmpeg:');
  console.log('   brew install ffmpeg');
  console.log('');
  console.log('   Or run this manually:');
  console.log(`   ffmpeg -i "${inputPath}" -c copy -movflags +faststart "${outputPath}" -y`);
  console.log(`   mv "${outputPath}" "${inputPath}"`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

