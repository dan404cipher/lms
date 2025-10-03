#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { Activity } from '../src/models/Activity';
import { User } from '../src/models/User';
import { Course } from '../src/models/Course';

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed activities
const seedActivities = async () => {
  try {
    console.log('🌱 Seeding activities...');

    // Get some users and courses for seeding
    const users = await User.find().limit(5);
    const courses = await Course.find().limit(3);

    if (users.length === 0) {
      console.log('❌ No users found. Please create users first.');
      return;
    }

    if (courses.length === 0) {
      console.log('❌ No courses found. Please create courses first.');
      return;
    }

    // Sample activities to create
    const activities: any[] = [];

    // Login activities (last 7 days)
    for (let i = 0; i < 20; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      if (!user) continue;
      
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);
      createdAt.setHours(createdAt.getHours() - hoursAgo);

      activities.push({
        userId: user._id,
        type: 'login',
        title: 'User logged in',
        description: 'User successfully logged into the system',
        metadata: {
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt
      });
    }

    // Course enrollments
    for (let i = 0; i < 10; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const course = courses[Math.floor(Math.random() * courses.length)];
      if (!user || !course) continue;
      
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      activities.push({
        userId: user._id,
        type: 'course_enrollment',
        title: `Enrolled in ${course.title}`,
        description: `User enrolled in course: ${course.title}`,
        metadata: {
          courseId: course._id,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt
      });
    }

    // Course views
    for (let i = 0; i < 25; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const course = courses[Math.floor(Math.random() * courses.length)];
      if (!user || !course) continue;
      
      const daysAgo = Math.floor(Math.random() * 14);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      activities.push({
        userId: user._id,
        type: 'course_view',
        title: `Viewed ${course.title}`,
        description: `User viewed course: ${course.title}`,
        metadata: {
          courseId: course._id,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt
      });
    }

    // Profile updates
    for (let i = 0; i < 8; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      if (!user) continue;
      
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      activities.push({
        userId: user._id,
        type: 'profile_update',
        title: 'Profile updated',
        description: 'User updated their profile information',
        metadata: {
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt
      });
    }

    // Material downloads
    for (let i = 0; i < 15; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const course = courses[Math.floor(Math.random() * courses.length)];
      if (!user || !course) continue;
      
      const daysAgo = Math.floor(Math.random() * 21);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      activities.push({
        userId: user._id,
        type: 'material_download',
        title: 'Downloaded Course Material',
        description: `User downloaded material from course: ${course.title} (Size: 2.5 MB)`,
        metadata: {
          courseId: course._id,
          fileSize: 2500000,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt
      });
    }

    // Admin actions (for admin users)
    const adminUsers = users.filter(user => ['admin', 'super_admin'].includes(user.role));
    if (adminUsers.length > 0) {
      for (let i = 0; i < 5; i++) {
        const admin = adminUsers[Math.floor(Math.random() * adminUsers.length)];
        const targetUser = users[Math.floor(Math.random() * users.length)];
        if (!admin || !targetUser) continue;
        
        const daysAgo = Math.floor(Math.random() * 30);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);

        activities.push({
          userId: admin._id,
          type: 'admin_action',
          title: 'Admin action: User Management',
          description: 'Admin performed user management action',
          metadata: {
            targetUserId: targetUser._id,
            actionDetails: { action: 'user_updated', targetEmail: targetUser.email },
            ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          createdAt
        });
      }
    }

    // Instructor actions (for instructor users)
    const instructorUsers = users.filter(user => user.role === 'instructor');
    if (instructorUsers.length > 0) {
      for (let i = 0; i < 8; i++) {
        const instructor = instructorUsers[Math.floor(Math.random() * instructorUsers.length)];
        const course = courses[Math.floor(Math.random() * courses.length)];
        if (!instructor || !course) continue;
        
        const daysAgo = Math.floor(Math.random() * 30);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);

        activities.push({
          userId: instructor._id,
          type: 'instructor_action',
          title: 'Instructor action: Course Management',
          description: 'Instructor performed course management action',
          metadata: {
            courseId: course._id,
            actionDetails: { action: 'course_updated', courseTitle: course.title },
            ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          createdAt
        });
      }
    }

    // Clear existing activities (optional - comment out if you want to keep existing data)
    // await Activity.deleteMany({});
    // console.log('🗑️  Cleared existing activities');

    // Insert activities
    await Activity.insertMany(activities);

    console.log(`✅ Successfully seeded ${activities.length} activities`);
    console.log(`📊 Activity breakdown:`);
    console.log(`   - Login activities: ${activities.filter(a => a.type === 'login').length}`);
    console.log(`   - Course enrollments: ${activities.filter(a => a.type === 'course_enrollment').length}`);
    console.log(`   - Course views: ${activities.filter(a => a.type === 'course_view').length}`);
    console.log(`   - Profile updates: ${activities.filter(a => a.type === 'profile_update').length}`);
    console.log(`   - Material downloads: ${activities.filter(a => a.type === 'material_download').length}`);
    console.log(`   - Admin actions: ${activities.filter(a => a.type === 'admin_action').length}`);
    console.log(`   - Instructor actions: ${activities.filter(a => a.type === 'instructor_action').length}`);

  } catch (error) {
    console.error('❌ Error seeding activities:', error);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await seedActivities();
    console.log('🎉 Activity seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error in main execution:', error);
    process.exit(1);
  }
};

main();
