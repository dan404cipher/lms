import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import User model
import { User } from '../src/models/User';

async function listUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';
    await mongoose.connect(mongoUri);
    
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({})
      .select('name email role zoomEmail status')
      .sort({ role: 1, name: 1 });

    console.log('📋 All Users in System:');
    console.log('=' .repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Zoom Email: ${user.zoomEmail || 'NOT SET ⚠️'}`);
      console.log(`   Status: ${user.status}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Total Users: ${users.length}`);
    
    const admins = users.filter(u => ['admin', 'super_admin'].includes(u.role));
    const instructors = users.filter(u => u.role === 'instructor');
    const usersWithZoom = users.filter(u => u.zoomEmail);
    
    console.log(`   - Admins: ${admins.length}`);
    console.log(`   - Instructors: ${instructors.length}`);
    console.log(`   - Users with Zoom Email configured: ${usersWithZoom.length}`);

    console.log('\n💡 To set Zoom emails, run:');
    console.log('   npm run set-zoom-emails');
    
  } catch (error) {
    console.error('❌ Error listing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
listUsers();

