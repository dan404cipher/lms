const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Use the bundled ffmpeg
let ffmpegPath;
try {
  ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  console.log('✅ Using bundled ffmpeg:', ffmpegPath);
} catch (e) {
  try {
    ffmpegPath = require('ffmpeg-static');
    console.log('✅ Using ffmpeg-static:', ffmpegPath);
  } catch (e2) {
    console.error('❌ Please wait for ffmpeg to install or install manually');
    process.exit(1);
  }
}

const videoFileName = '16c07b28-b591-4a71-8323-7e18dfb7b3d0_1759507644797.mp4';
const recordingsDir = path.join(__dirname, '../recordings');
const inputPath = path.join(recordingsDir, videoFileName);
const outputPath = path.join(recordingsDir, videoFileName.replace('.mp4', '_web.mp4'));

console.log('🎬 Converting video to browser-compatible format...');
console.log('Input:', inputPath);
console.log('Output:', outputPath);

// Convert with web-compatible settings
try {
  execSync(
    `"${ffmpegPath}" -i "${inputPath}" -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${outputPath}" -y`,
    { stdio: 'inherit', maxBuffer: 50 * 1024 * 1024 }
  );
  
  // Replace original with converted version
  const backupPath = inputPath + '.original';
  fs.renameSync(inputPath, backupPath);
  fs.renameSync(outputPath, inputPath);
  
  console.log('');
  console.log('✅ Video converted successfully!');
  console.log('💾 Original backed up to:', backupPath);
  console.log('🎉 Refresh your browser and try playing the video again.');
  
} catch (error) {
  console.error('❌ Conversion failed:', error.message);
  process.exit(1);
}

