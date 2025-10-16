import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { ZoomHost } from '../src/models/ZoomHost';

/**
 * Initialize Zoom Pro Host Accounts
 * This script sets up the two Zoom Pro accounts for concurrent meeting support
 */
async function initializeZoomHosts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/new-lms';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Define your two Zoom Pro accounts
    const zoomHosts = [
      {
        email: 'venkteshanj@axesstechnology.in',
        displayName: 'Axess Technology Zoom Account',
        isActive: true,
        isPrimary: true, // Set as primary/default host
        maxConcurrentMeetings: 1, // Standard Zoom Pro limit
        priority: 100, // Higher priority (preferred)
        currentMeetings: 0,
        metadata: {
          notes: 'Primary Zoom Pro account for Axess Technology'
        }
      },
      {
        email: 'developer@v-accel.ai',
        displayName: 'V-Accel Developer Zoom Account',
        isActive: true,
        isPrimary: false,
        maxConcurrentMeetings: 1, // Standard Zoom Pro limit
        priority: 90, // Slightly lower priority
        currentMeetings: 0,
        metadata: {
          notes: 'Secondary Zoom Pro account for V-Accel'
        }
      }
    ];

    console.log('\n📋 Initializing Zoom host accounts...\n');

    for (const hostData of zoomHosts) {
      // Check if host already exists
      const existingHost = await ZoomHost.findOne({ email: hostData.email });

      if (existingHost) {
        console.log(`ℹ️  Host already exists: ${hostData.email}`);
        
        // Update the existing host (in case you want to modify settings)
        existingHost.displayName = hostData.displayName;
        existingHost.isActive = hostData.isActive;
        existingHost.isPrimary = hostData.isPrimary;
        existingHost.maxConcurrentMeetings = hostData.maxConcurrentMeetings;
        existingHost.priority = hostData.priority;
        existingHost.metadata.notes = hostData.metadata.notes;
        
        await existingHost.save();
        console.log(`✅ Updated host: ${hostData.email}`);
        console.log(`   - Display Name: ${existingHost.displayName}`);
        console.log(`   - Priority: ${existingHost.priority}`);
        console.log(`   - Current Meetings: ${existingHost.currentMeetings}/${existingHost.maxConcurrentMeetings}`);
        console.log(`   - Active: ${existingHost.isActive}`);
        console.log('');
      } else {
        // Create new host
        const newHost = await ZoomHost.create(hostData);
        console.log(`✅ Created new host: ${newHost.email}`);
        console.log(`   - Display Name: ${newHost.displayName}`);
        console.log(`   - Priority: ${newHost.priority}`);
        console.log(`   - Max Concurrent Meetings: ${newHost.maxConcurrentMeetings}`);
        console.log(`   - Active: ${newHost.isActive}`);
        console.log('');
      }
    }

    // Display summary
    console.log('\n📊 Zoom Host Summary:\n');
    const allHosts = await ZoomHost.find().sort({ priority: -1 });
    
    allHosts.forEach((host, index) => {
      console.log(`${index + 1}. ${host.email}`);
      console.log(`   Status: ${host.isActive ? '🟢 Active' : '🔴 Inactive'}`);
      console.log(`   Priority: ${host.priority} ${host.isPrimary ? '(Primary)' : ''}`);
      console.log(`   Capacity: ${host.currentMeetings}/${host.maxConcurrentMeetings} meetings`);
      console.log(`   Available: ${host.canHostMeeting() ? '✅ Yes' : '❌ No (at capacity)'}`);
      console.log('');
    });

    console.log('✅ Zoom hosts initialized successfully!');
    console.log('\n💡 Tips:');
    console.log('   - The system will automatically distribute meetings across available hosts');
    console.log('   - Primary host (higher priority) will be preferred when both are available');
    console.log('   - Each Zoom Pro account can host 1 meeting at a time');
    console.log('   - To add more hosts, edit this script and run it again');
    console.log('\n🔧 To sync host meeting counts with actual sessions, run:');
    console.log('   npm run sync-zoom-hosts');

  } catch (error) {
    console.error('❌ Error initializing Zoom hosts:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
initializeZoomHosts()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

