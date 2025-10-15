import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Import the actual User model
import { User } from '../src/models/User';

async function createAdminUserCorrect() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://prod:z5eJcHBfDAmn7QKU@prod-1.i5p8bt.mongodb.net/lms?retryWrites=true&w=majority&appName=lms';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Delete existing admin user
    await User.deleteOne({ email: 'admin@lms.com' });
    console.log('✅ Deleted existing admin user');

    // Create admin user WITHOUT password first (to avoid double hashing)
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@lms.com',
      password: 'admin123', // This will be hashed by the pre-save hook
      role: 'admin',
      status: 'active',
      emailVerified: true,
      credits: 1000,
      profile: {
        bio: 'System Administrator for the LMS platform',
        phone: '',
        location: '',
        website: '',
        socialLinks: {
          linkedin: '',
          twitter: '',
          github: ''
        }
      },
      preferences: {
        notifications: {
          email: true,
          push: true,
          inApp: true
        },
        language: 'en',
        timezone: 'UTC'
      }
    });

    // Save the user (this will trigger the pre-save hook to hash the password)
    await adminUser.save();
    console.log('✅ Admin user created successfully!');

    // Test the password immediately after saving
    const testPassword = 'admin123';
    const passwordTest = await adminUser.comparePassword(testPassword);
    console.log('✅ Password test result:', passwordTest ? 'Valid' : 'Invalid');

    // Also test by fetching from database
    const savedUser = await User.findOne({ email: 'admin@lms.com' }).select('+password');
    if (savedUser) {
      const dbPasswordTest = await savedUser.comparePassword(testPassword);
      console.log('✅ Database password test:', dbPasswordTest ? 'Valid' : 'Invalid');
    }

    console.log('\n📋 Login credentials:');
    console.log('Email: admin@lms.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
createAdminUserCorrect();
