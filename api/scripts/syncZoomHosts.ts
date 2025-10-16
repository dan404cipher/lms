import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import hostAssignmentService from '../src/services/hostAssignmentService';

/**
 * Sync Zoom Host Meeting Counts
 * Use this script to fix any inconsistencies in host meeting counts
 */
async function syncZoomHosts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/lms';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔄 Syncing Zoom host meeting counts...\n');

    await hostAssignmentService.syncHostMeetingCounts();

    // Display current status
    const hosts = await hostAssignmentService.getAllHostsStatus();
    
    console.log('\n📊 Current Zoom Host Status:\n');
    hosts.forEach((host, index) => {
      console.log(`${index + 1}. ${host.email}`);
      console.log(`   Status: ${host.isActive ? '🟢 Active' : '🔴 Inactive'}`);
      console.log(`   Priority: ${host.priority} ${host.isPrimary ? '(Primary)' : ''}`);
      console.log(`   Current Load: ${host.currentMeetings}/${host.maxConcurrentMeetings} meetings`);
      console.log(`   Available: ${host.canHostMeeting() ? '✅ Yes' : '❌ No (at capacity)'}`);
      console.log(`   Last Used: ${host.metadata.lastUsed || 'Never'}`);
      console.log(`   Total Meetings Hosted: ${host.metadata.totalMeetingsHosted || 0}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error syncing Zoom hosts:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
syncZoomHosts()
  .then(() => {
    console.log('\n✨ Sync completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  });

