import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// User schema (simplified version)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['learner', 'instructor', 'admin'], default: 'learner' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function checkAdminUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://prod:z5eJcHBfDAmn7QKU@prod-1.i5p8bt.mongodb.net/lms?retryWrites=true&w=majority&appName=lms';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@lms.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('✅ Admin user found:');
    console.log('ID:', adminUser._id);
    console.log('Name:', adminUser.name);
    console.log('Email:', adminUser.email);
    console.log('Role:', adminUser.role);
    console.log('Is Active:', adminUser.isActive);
    console.log('Password hash length:', adminUser.password.length);
    console.log('Password hash (first 20 chars):', adminUser.password.substring(0, 20) + '...');

    // Test password verification
    const testPassword = 'admin123';
    const isPasswordValid = await bcrypt.compare(testPassword, adminUser.password);
    console.log('Password verification test:', isPasswordValid ? '✅ Valid' : '❌ Invalid');

    // Test with different password
    const wrongPassword = 'wrongpassword';
    const isWrongPasswordValid = await bcrypt.compare(wrongPassword, adminUser.password);
    console.log('Wrong password test:', isWrongPasswordValid ? '❌ Should be invalid' : '✅ Correctly invalid');

  } catch (error) {
    console.error('❌ Error checking admin user:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
checkAdminUser();
