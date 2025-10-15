import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Import the actual User model
import { User } from '../src/models/User';

async function debugLogin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGO_URI environment variable is required');
      process.exit(1);
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find admin user with password field
    const adminUser = await User.findOne({ email: 'admin@lms.com' }).select('+password');
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('✅ Admin user found:');
    console.log('ID:', adminUser._id);
    console.log('Name:', adminUser.name);
    console.log('Email:', adminUser.email);
    console.log('Role:', adminUser.role);
    console.log('Status:', adminUser.status);
    console.log('Password hash length:', adminUser.password.length);
    console.log('Password hash (first 30 chars):', adminUser.password.substring(0, 30) + '...');

    // Test password verification using the model method
    const testPassword = 'admin123';
    console.log('\n🔐 Testing password verification...');
    
    try {
      const isPasswordValid = await adminUser.comparePassword(testPassword);
      console.log('Model comparePassword result:', isPasswordValid ? '✅ Valid' : '❌ Invalid');
    } catch (error) {
      console.log('❌ Error in comparePassword:', error);
    }

    // Test direct bcrypt comparison
    try {
      const directComparison = await bcrypt.compare(testPassword, adminUser.password);
      console.log('Direct bcrypt comparison:', directComparison ? '✅ Valid' : '❌ Invalid');
    } catch (error) {
      console.log('❌ Error in direct bcrypt comparison:', error);
    }

    // Test with wrong password
    const wrongPassword = 'wrongpassword';
    try {
      const wrongResult = await adminUser.comparePassword(wrongPassword);
      console.log('Wrong password test:', wrongResult ? '❌ Should be invalid' : '✅ Correctly invalid');
    } catch (error) {
      console.log('❌ Error in wrong password test:', error);
    }

    // Check if user is active
    console.log('\n📊 User status check:');
    console.log('Is Active:', adminUser.status === 'active');
    console.log('Email Verified:', adminUser.emailVerified);

  } catch (error) {
    console.error('❌ Error in debug:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
debugLogin();
