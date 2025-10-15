import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Import the actual User model
import { User } from '../src/models/User';

async function createProperAdminUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://prod:z5eJcHBfDAmn7QKU@prod-1.i5p8bt.mongodb.net/lms?retryWrites=true&w=majority&appName=lms';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@lms.com' });
    if (existingAdmin) {
      console.log('❌ Admin user already exists. Deleting old one...');
      await User.deleteOne({ email: 'admin@lms.com' });
      console.log('✅ Old admin user deleted');
    }

    // Create proper admin user with all required fields
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
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
    
    console.log('✅ Proper admin user created successfully!');
    console.log('Admin user details:', {
      id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      status: adminUser.status,
      emailVerified: adminUser.emailVerified,
      credits: adminUser.credits
    });
    console.log('\n📋 Login credentials:');
    console.log('Email: admin@lms.com');
    console.log('Password: admin123');
    console.log('\n⚠️  Please change the password after first login!');

    // Test the comparePassword method
    const testPassword = 'admin123';
    const isPasswordValid = await adminUser.comparePassword(testPassword);
    console.log('\n🔐 Password verification test:', isPasswordValid ? '✅ Valid' : '❌ Invalid');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
createProperAdminUser();
