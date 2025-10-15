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

async function createAdminUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://prod:z5eJcHBfDAmn7QKU@prod-1.i5p8bt.mongodb.net/lms?retryWrites=true&w=majority&appName=lms';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@lms.com' });
    if (existingAdmin) {
      console.log('❌ Admin user already exists with email: admin@lms.com');
      console.log('Admin user details:', {
        id: existingAdmin._id,
        name: existingAdmin.name,
        email: existingAdmin.email,
        role: existingAdmin.role
      });
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@lms.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('Admin user details:', {
      id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role
    });
    console.log('\n📋 Login credentials:');
    console.log('Email: admin@lms.com');
    console.log('Password: admin123');
    console.log('\n⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
createAdminUser();
