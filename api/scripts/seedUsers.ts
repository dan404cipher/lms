#!/usr/bin/env node

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../src/models/User';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';

// Demo users from the login page
const demoUsers = [
  {
    name: 'Admin User',
    email: 'admin@axessupskill.com',
    password: 'admin123',
    role: 'admin' as const,
    profile: {
      bio: 'System administrator for Axess Upskill LMS',
      location: 'Remote',
      website: 'https://axessupskill.com'
    },
    credits: 1000,
    status: 'active' as const,
    emailVerified: true,
    preferences: {
      notifications: {
        email: true,
        push: true,
        inApp: true
      },
      language: 'en',
      timezone: 'UTC'
    }
  },
  {
    name: 'Dr. AI Specialist',
    email: 'ai.specialist@example.com',
    password: 'password123',
    role: 'instructor' as const,
    profile: {
      bio: 'Expert in artificial intelligence and machine learning with over 10 years of experience',
      location: 'Stanford, CA',
      website: 'https://ai-specialist.dev',
      socialLinks: {
        linkedin: 'https://linkedin.com/in/ai-specialist',
        twitter: 'https://twitter.com/ai_specialist',
        github: 'https://github.com/ai-specialist'
      }
    },
    credits: 0,
    status: 'active' as const,
    emailVerified: true,
    preferences: {
      notifications: {
        email: true,
        push: true,
        inApp: true
      },
      language: 'en',
      timezone: 'America/Los_Angeles'
    }
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'learner' as const,
    profile: {
      bio: 'Passionate learner interested in AI and machine learning. Currently pursuing advanced studies in computer science.',
      location: 'San Francisco, CA',
      socialLinks: {
        linkedin: 'https://linkedin.com/in/johndoe',
        github: 'https://github.com/johndoe'
      }
    },
    credits: 100,
    status: 'active' as const,
    emailVerified: true,
    preferences: {
      notifications: {
        email: true,
        push: true,
        inApp: true
      },
      language: 'en',
      timezone: 'America/Los_Angeles'
    }
  }
];

async function seedUsers() {
  try {
    console.log('🌱 Starting user seeding...');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users
    console.log('🧹 Clearing existing users...');
    await User.deleteMany({});
    console.log('✅ Cleared existing users');

    // Hash passwords and create users
    console.log('👥 Creating demo users...');
    const hashedUsers = await Promise.all(
      demoUsers.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 12)
      }))
    );

    const createdUsers = await User.insertMany(hashedUsers);
    console.log(`✅ Created ${createdUsers.length} demo users`);

    console.log('\n🎉 User seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${createdUsers.length} users created`);
    
    console.log('\n🔑 Demo Accounts Created:');
    console.log('Admin: admin@axessupskill.com / admin123');
    console.log('Instructor: ai.specialist@example.com / password123');
    console.log('Learner: john@example.com / password123');

    console.log('\n📝 User Details:');
    createdUsers.forEach(user => {
      console.log(`- ${user.name} (${user.role}): ${user.email}`);
    });

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
seedUsers();

