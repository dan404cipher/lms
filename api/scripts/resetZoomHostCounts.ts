import mongoose from 'mongoose';
import { ZoomHost } from '../src/models/ZoomHost';
import { Session } from '../src/models/Session';

/**
 * Reset Zoom Host Meeting Counts
 * This script resets the currentMeetings count for all Zoom hosts
 * and syncs them with actual active sessions
 */

async function resetZoomHostCounts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    console.log('\n📊 ===== CURRENT ZOOM HOST STATUS =====\n');

    // Get all hosts
    const hosts = await ZoomHost.find();
    
    if (hosts.length === 0) {
      console.log('❌ No Zoom hosts found in database!');
      console.log('💡 Please run: npx ts-node scripts/initializeZoomHosts.ts');
      process.exit(1);
    }

    // Display current status
    hosts.forEach((host, index) => {
      console.log(`Host #${index + 1}:`);
      console.log(`  Email: ${host.email}`);
      console.log(`  Display Name: ${host.displayName}`);
      console.log(`  Is Active: ${host.isActive}`);
      console.log(`  Current Meetings (BEFORE): ${host.currentMeetings}/${host.maxConcurrentMeetings}`);
      console.log(`  Priority: ${host.priority}`);
      console.log('');
    });

    console.log('\n🔄 ===== RESETTING MEETING COUNTS =====\n');

    // Count actual active sessions for each host
    const now = new Date();
    
    for (const host of hosts) {
      // Find active sessions for this host
      // A session is considered active if:
      // 1. Status is 'scheduled' or 'live'
      // 2. The scheduled time has passed (or is now)
      // 3. The session hasn't ended yet (scheduledAt + duration > now)
      
      const activeSessions = await Session.find({
        zoomHostEmail: host.email,
        status: { $in: ['scheduled', 'live'] }
      });

      let actualActiveCount = 0;
      
      for (const session of activeSessions) {
        const sessionStart = new Date(session.scheduledAt);
        const sessionEnd = new Date(sessionStart.getTime() + session.duration * 60000);
        
        // Check if session is currently active (started and not ended)
        if (sessionStart <= now && sessionEnd > now) {
          actualActiveCount++;
          console.log(`  📌 Active session found: ${session.title}`);
          console.log(`     Scheduled: ${sessionStart.toLocaleString()}`);
          console.log(`     Ends: ${sessionEnd.toLocaleString()}`);
        }
      }

      const oldCount = host.currentMeetings;
      host.currentMeetings = actualActiveCount;
      await host.save();

      console.log(`\n✅ ${host.email}:`);
      console.log(`   Old count: ${oldCount}`);
      console.log(`   New count: ${actualActiveCount}`);
      console.log(`   Can host meeting: ${host.canHostMeeting()}`);
      console.log('');
    }

    console.log('\n✅ ===== RESET COMPLETE =====\n');
    console.log('All Zoom host meeting counts have been synced with active sessions.');
    
    // Show final status
    console.log('\n📊 ===== FINAL STATUS =====\n');
    const updatedHosts = await ZoomHost.find();
    updatedHosts.forEach((host, index) => {
      console.log(`Host #${index + 1}: ${host.email}`);
      console.log(`  Current Meetings: ${host.currentMeetings}/${host.maxConcurrentMeetings}`);
      console.log(`  Can Host: ${host.canHostMeeting() ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error resetting Zoom host counts:', error);
    process.exit(1);
  }
}

// Run the script
resetZoomHostCounts();

