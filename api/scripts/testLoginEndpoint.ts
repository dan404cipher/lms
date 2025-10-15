import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Import the actual User model
import { User } from '../src/models/User';

async function testLoginEndpoint() {
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

    // Test the exact same query that the login endpoint uses
    const email = 'admin@lms.com';
    console.log(`🔍 Looking for user with email: ${email}`);
    
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log('✅ User found:');
    console.log('ID:', user._id);
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Status:', user.status);
    console.log('Password field exists:', !!user.password);
    console.log('Password length:', user.password ? user.password.length : 'N/A');

    // Test password comparison
    const password = 'admin123';
    console.log(`🔐 Testing password: ${password}`);
    
    const isPasswordCorrect = await user.comparePassword(password);
    console.log('Password comparison result:', isPasswordCorrect ? '✅ Valid' : '❌ Invalid');

    // Check environment variables
    console.log('\n🔧 Environment check:');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 'N/A');
    console.log('JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN || 'Not set');

  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
testLoginEndpoint();
