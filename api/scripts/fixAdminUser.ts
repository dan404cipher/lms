import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Import the actual User model
import { User } from '../src/models/User';

async function fixAdminUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://prod:z5eJcHBfDAmn7QKU@prod-1.i5p8bt.mongodb.net/lms?retryWrites=true&w=majority&appName=lms';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Delete existing admin user
    await User.deleteOne({ email: 'admin@lms.com' });
    console.log('✅ Deleted existing admin user');

    // Create a fresh password hash
    const password = 'admin123';
    console.log('🔐 Creating fresh password hash...');
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('✅ Password hashed successfully');
    console.log('Hash length:', hashedPassword.length);
    console.log('Hash (first 30 chars):', hashedPassword.substring(0, 30) + '...');

    // Test the hash immediately
    const testResult = await bcrypt.compare(password, hashedPassword);
    console.log('✅ Hash test result:', testResult ? 'Valid' : 'Invalid');

    // Create new admin user
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@lms.com',
      password: hashedPassword,
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

    await adminUser.save();
    console.log('✅ New admin user created successfully!');

    // Test the saved user's password
    const savedUser = await User.findOne({ email: 'admin@lms.com' }).select('+password');
    if (savedUser) {
      const passwordTest = await savedUser.comparePassword(password);
      console.log('✅ Saved user password test:', passwordTest ? 'Valid' : 'Invalid');
      
      const directTest = await bcrypt.compare(password, savedUser.password);
      console.log('✅ Direct password test:', directTest ? 'Valid' : 'Invalid');
    }

    console.log('\n📋 Login credentials:');
    console.log('Email: admin@lms.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('❌ Error fixing admin user:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
fixAdminUser();
