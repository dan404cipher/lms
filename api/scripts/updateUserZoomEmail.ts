import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import User model
import { User } from '../src/models/User';

// Configuration: Map LMS emails to Zoom emails
const ZOOM_EMAIL_MAPPING: { [lmsEmail: string]: string } = {
  // Add your mappings here
  // Example: 'instructor@example.com': 'zoom-instructor@example.com'
};

async function updateUserZoomEmail(userEmail: string, zoomEmail: string) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';
    await mongoose.connect(mongoUri);
    
    console.log('✅ Connected to MongoDB\n');

    // Find and update the user
    const user = await User.findOneAndUpdate(
      { email: userEmail },
      { zoomEmail: zoomEmail },
      { new: true }
    );

    if (user) {
      console.log('✅ Successfully updated user:');
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Zoom Email: ${user.zoomEmail}`);
    } else {
      console.log(`❌ User with email "${userEmail}" not found`);
    }
    
  } catch (error) {
    console.error('❌ Error updating user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log('Usage: npm run update-user-zoom <user-email> <zoom-email>');
  console.log('Example: npm run update-user-zoom instructor@example.com zoom@example.com');
  process.exit(1);
}

const [userEmail, zoomEmail] = args;
updateUserZoomEmail(userEmail, zoomEmail);

