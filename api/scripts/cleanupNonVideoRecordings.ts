import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Recording } from '../src/models/Recording';

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';

async function cleanupNonVideoRecordings() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all recordings
    const recordings = await Recording.find({});
    console.log(`\n📊 Found ${recordings.length} total recordings in database`);

    let deletedCount = 0;
    let audioOnlyCount = 0;
    let missingFileCount = 0;
    let validCount = 0;

    for (const recording of recordings) {
      const recordingId = recording._id;
      const title = recording.title;
      
      // Check if title contains indicators of non-video files
      const isAudioOnly = title.toLowerCase().includes('audio') || 
                         title.toLowerCase().includes('m4a');
      const isTranscript = title.toLowerCase().includes('transcript') || 
                          title.toLowerCase().includes('chat') ||
                          title.toLowerCase().includes('timeline');
      
      if (recording.localFilePath) {
        const fileName = path.basename(recording.localFilePath);
        const filePath = path.join(process.cwd(), 'recordings', fileName);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          console.log(`⚠️  Missing file: ${fileName}`);
          console.log(`   Title: ${title}`);
          console.log(`   Deleting database record...`);
          await Recording.findByIdAndDelete(recordingId);
          missingFileCount++;
          deletedCount++;
          continue;
        }

        // Check file size - if it's suspiciously small, it might not be a real video
        const stats = fs.statSync(filePath);
        const sizeInMB = stats.size / (1024 * 1024);
        
        if (sizeInMB < 0.5) {
          console.log(`🚫 Suspiciously small file (${sizeInMB.toFixed(2)}MB): ${fileName}`);
          console.log(`   Title: ${title}`);
          console.log(`   Deleting file and database record...`);
          fs.unlinkSync(filePath);
          await Recording.findByIdAndDelete(recordingId);
          deletedCount++;
          continue;
        }

        if (isAudioOnly) {
          console.log(`🎵 Audio-only file detected: ${fileName}`);
          console.log(`   Title: ${title}`);
          console.log(`   Size: ${sizeInMB.toFixed(2)}MB`);
          console.log(`   Deleting file and database record...`);
          fs.unlinkSync(filePath);
          await Recording.findByIdAndDelete(recordingId);
          audioOnlyCount++;
          deletedCount++;
          continue;
        }

        if (isTranscript) {
          console.log(`📝 Transcript/Chat file detected: ${fileName}`);
          console.log(`   Title: ${title}`);
          console.log(`   Deleting file and database record...`);
          fs.unlinkSync(filePath);
          await Recording.findByIdAndDelete(recordingId);
          deletedCount++;
          continue;
        }

        console.log(`✅ Valid video: ${fileName} (${sizeInMB.toFixed(2)}MB) - ${title}`);
        validCount++;
      } else {
        // No local file path - check if it's pointing to Zoom URL only
        if (isAudioOnly || isTranscript) {
          console.log(`🗑️  Remote non-video recording: ${title}`);
          console.log(`   Deleting database record...`);
          await Recording.findByIdAndDelete(recordingId);
          deletedCount++;
        } else {
          console.log(`🌐 Remote video recording: ${title}`);
          validCount++;
        }
      }
    }

    console.log('\n📊 Cleanup Summary:');
    console.log(`   ✅ Valid video recordings: ${validCount}`);
    console.log(`   🗑️  Deleted recordings: ${deletedCount}`);
    console.log(`      - Audio-only files: ${audioOnlyCount}`);
    console.log(`      - Missing files: ${missingFileCount}`);
    console.log(`      - Other non-video: ${deletedCount - audioOnlyCount - missingFileCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Cleanup completed and disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cleanupNonVideoRecordings();

