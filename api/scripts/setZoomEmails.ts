import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import User model
import { User } from '../src/models/User';

async function setZoomEmails() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';
    await mongoose.connect(mongoUri);
    
    console.log('✅ Connected to MongoDB');

    console.log('📝 Setting up Zoom emails for Pro plan users...\n');

    // Configuration for your two Zoom Pro accounts
    const zoomAccounts = [
      {
        zoomEmail: 'venkteshanj@axesstechnology.in',
        description: 'Admin Zoom Account'
      },
      {
        zoomEmail: 'developer@v-accel.ai',
        description: 'Owner Zoom Account'
      }
    ];

    // Get all admin and instructor users who can host meetings
    const users = await User.find({
      role: { $in: ['admin', 'super_admin', 'instructor'] }
    }).sort({ createdAt: 1 }); // Sort by creation date

    if (users.length === 0) {
      console.log('❌ No admin or instructor users found');
      return;
    }

    console.log(`Found ${users.length} admin/instructor user(s):\n`);
    users.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.name} (${user.email}) - ${user.role}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('ASSIGNMENT PLAN:');
    console.log('='.repeat(80));

    // Assign Zoom emails to users
    const assignments = [];
    for (let i = 0; i < Math.min(users.length, zoomAccounts.length); i++) {
      const user = users[i];
      const zoomAccount = zoomAccounts[i];
      
      console.log(`\n${i + 1}. ${user.name} (${user.email})`);
      console.log(`   → Will be assigned: ${zoomAccount.zoomEmail} (${zoomAccount.description})`);
      
      assignments.push({ user, zoomEmail: zoomAccount.zoomEmail });
    }

    console.log('\n' + '='.repeat(80));
    console.log('Proceeding with assignments...\n');

    // Execute the assignments
    for (const assignment of assignments) {
      const updatedUser = await User.findByIdAndUpdate(
        assignment.user._id,
        { zoomEmail: assignment.zoomEmail },
        { new: true }
      );

      if (updatedUser) {
        console.log('✅ Updated:', updatedUser.name);
        console.log(`   LMS Email: ${updatedUser.email}`);
        console.log(`   Zoom Email: ${updatedUser.zoomEmail}`);
        console.log(`   Role: ${updatedUser.role}\n`);
      }
    }

    console.log('\n📋 All users with Zoom emails:');
    const usersWithZoom = await User.find({ zoomEmail: { $exists: true, $ne: null } })
      .select('name email role zoomEmail');
    
    usersWithZoom.forEach(user => {
      console.log(`   - ${user.name} (${user.role}): LMS Email: ${user.email}, Zoom Email: ${user.zoomEmail}`);
    });

    console.log('\n✅ Zoom email configuration complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Verify that the correct users have been updated');
    console.log('   2. If needed, manually update users using MongoDB or admin panel');
    console.log('   3. Test creating sessions with both users to verify concurrent meetings work');
    
  } catch (error) {
    console.error('❌ Error setting Zoom emails:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
setZoomEmails();

