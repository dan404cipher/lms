const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../dist/models/User').default;
const Category = require('../dist/models/Category').default;

async function setupDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms');
    console.log('✅ Connected to MongoDB');

    // Create default categories
    const categories = [
      {
        name: 'Programming',
        description: 'Learn programming languages and software development',
        slug: 'programming',
        icon: '💻',
        color: '#3B82F6',
        order: 1
      },
      {
        name: 'Design',
        description: 'Graphic design, UI/UX, and creative skills',
        slug: 'design',
        icon: '🎨',
        color: '#EF4444',
        order: 2
      },
      {
        name: 'Business',
        description: 'Business management, marketing, and entrepreneurship',
        slug: 'business',
        icon: '💼',
        color: '#10B981',
        order: 3
      },
      {
        name: 'Language',
        description: 'Learn new languages and communication skills',
        slug: 'language',
        icon: '🗣️',
        color: '#F59E0B',
        order: 4
      },
      {
        name: 'Technology',
        description: 'Emerging technologies and digital skills',
        slug: 'technology',
        icon: '🚀',
        color: '#8B5CF6',
        order: 5
      }
    ];

    for (const categoryData of categories) {
      const existingCategory = await Category.findOne({ slug: categoryData.slug });
      if (!existingCategory) {
        await Category.create(categoryData);
        console.log(`✅ Created category: ${categoryData.name}`);
      } else {
        console.log(`⏭️  Category already exists: ${categoryData.name}`);
      }
    }

    // Create super admin user
    const superAdminData = {
      name: 'Super Admin',
      email: 'admin@lms.com',
      password: 'admin123',
      role: 'super_admin',
      emailVerified: true,
      credits: 1000
    };

    const existingSuperAdmin = await User.findOne({ email: superAdminData.email });
    if (!existingSuperAdmin) {
      await User.create(superAdminData);
      console.log('✅ Created super admin user');
      console.log('📧 Email: admin@lms.com');
      console.log('🔑 Password: admin123');
    } else {
      console.log('⏭️  Super admin user already exists');
    }

    // Create sample instructor
    const instructorData = {
      name: 'John Instructor',
      email: 'instructor@lms.com',
      password: 'instructor123',
      role: 'instructor',
      emailVerified: true,
      credits: 500,
      profile: {
        bio: 'Experienced instructor with 10+ years of teaching experience',
        location: 'New York, NY'
      }
    };

    const existingInstructor = await User.findOne({ email: instructorData.email });
    if (!existingInstructor) {
      await User.create(instructorData);
      console.log('✅ Created sample instructor');
      console.log('📧 Email: instructor@lms.com');
      console.log('🔑 Password: instructor123');
    } else {
      console.log('⏭️  Sample instructor already exists');
    }

    // Create sample learner
    const learnerData = {
      name: 'Jane Learner',
      email: 'learner@lms.com',
      password: 'learner123',
      role: 'learner',
      emailVerified: true,
      credits: 100,
      profile: {
        bio: 'Passionate learner eager to acquire new skills',
        location: 'San Francisco, CA'
      }
    };

    const existingLearner = await User.findOne({ email: learnerData.email });
    if (!existingLearner) {
      await User.create(learnerData);
      console.log('✅ Created sample learner');
      console.log('📧 Email: learner@lms.com');
      console.log('🔑 Password: learner123');
    } else {
      console.log('⏭️  Sample learner already exists');
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Default Users:');
    console.log('Super Admin: admin@lms.com / admin123');
    console.log('Instructor: instructor@lms.com / instructor123');
    console.log('Learner: learner@lms.com / learner123');
    console.log('\n⚠️  Remember to change these passwords in production!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
