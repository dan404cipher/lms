import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../src/models/User';
import { Course } from '../src/models/Course';
import { Category } from '../src/models/Category';
import { Module } from '../src/models/Module';
import { Lesson } from '../src/models/Lesson';
import { Enrollment } from '../src/models/Enrollment';
import { Session } from '../src/models/Session';
import { Chat } from '../src/models/Chat';
import { Notification } from '../src/models/Notification';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';

// Sample data
const categories = [
  {
    name: 'Overview',
    slug: 'overview',
    description: 'Program overview and introduction materials',
    icon: '📊',
    color: '#F59E0B'
  },
  {
    name: 'Computer Science',
    slug: 'computer-science',
    description: 'Computer science and programming courses',
    icon: '💻',
    color: '#3B82F6'
  },
  {
    name: 'Statistics',
    slug: 'statistics',
    description: 'Statistical analysis and methods',
    icon: '📈',
    color: '#10B981'
  },
  {
    name: 'Machine Learning',
    slug: 'machine-learning',
    description: 'Machine learning algorithms and applications',
    icon: '🧠',
    color: '#8B5CF6'
  },
  {
    name: 'Research',
    slug: 'research',
    description: 'Research methodology and academic writing',
    icon: '📚',
    color: '#EF4444'
  },
  {
    name: 'Preparation',
    slug: 'preparation',
    description: 'Preparatory materials and setup',
    icon: '⚙️',
    color: '#06B6D4'
  }
];

const users = [
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'learner',
    profile: {
      bio: 'Passionate learner interested in AI and machine learning',
      location: 'San Francisco, CA'
    },
    credits: 100
  },
  {
    name: 'Dr. AI Specialist',
    email: 'ai.specialist@example.com',
    password: 'password123',
    role: 'instructor',
    profile: {
      bio: 'Expert in artificial intelligence and machine learning',
      location: 'Stanford, CA',
      website: 'https://ai-specialist.dev'
    },
    credits: 0
  },
  {
    name: 'Shankar DK',
    email: 'shankar.dk@example.com',
    password: 'password123',
    role: 'instructor',
    profile: {
      bio: 'Statistics and data science expert',
      location: 'Bangalore, India'
    },
    credits: 0
  },
  {
    name: 'Dr Vijayakumar',
    email: 'vijayakumar@example.com',
    password: 'password123',
    role: 'instructor',
    profile: {
      bio: 'Machine learning and algorithm specialist',
      location: 'Chennai, India'
    },
    credits: 0
  },
  {
    name: 'Dr. Research Ethics',
    email: 'research.ethics@example.com',
    password: 'password123',
    role: 'instructor',
    profile: {
      bio: 'Research methodology and publication ethics expert',
      location: 'Delhi, India'
    },
    credits: 0
  },
  {
    name: 'Program Coordinator',
    email: 'coordinator@example.com',
    password: 'password123',
    role: 'instructor',
    profile: {
      bio: 'Program coordinator and overview specialist',
      location: 'Remote'
    },
    credits: 0
  },
  {
    name: 'Program Team',
    email: 'team@example.com',
    password: 'password123',
    role: 'instructor',
    profile: {
      bio: 'Program setup and preparation team',
      location: 'Remote'
    },
    credits: 0
  },
  {
    name: 'Admin User',
            email: 'admin@axessupskill.com',
    password: 'admin123',
    role: 'admin',
    profile: {
      bio: 'System administrator',
      location: 'Remote'
    },
    credits: 1000
  }
];

const courses = [
  {
    title: 'Program Overview',
    description: 'Introduction to the program structure and learning objectives.',
    shortDescription: 'Program overview and objectives',
    thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
    priceCredits: 0,
    difficulty: 'beginner',
    duration: 2, // hours
    published: true,
    courseCode: null
  },
  {
    title: '21CSC569T Fundamentals of Artificial Intelligence',
    description: 'Core concepts and principles of artificial intelligence.',
    shortDescription: 'AI fundamentals and principles',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
    priceCredits: 0,
    difficulty: 'intermediate',
    duration: 40,
    published: true,
    courseCode: '21CSC569T'
  },
  {
    title: '21CSC529T Inferential Statistics',
    description: 'Statistical methods for making inferences from data.',
    shortDescription: 'Statistical inference methods',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
    priceCredits: 0,
    difficulty: 'intermediate',
    duration: 35,
    published: true,
    courseCode: '21CSC529T'
  },
  {
    title: '21CSC555J Machine Learning Algorithm',
    description: 'Advanced machine learning algorithms and applications.',
    shortDescription: 'ML algorithms and applications',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    priceCredits: 0,
    difficulty: 'advanced',
    duration: 45,
    published: true,
    courseCode: '21CSC555J'
  },
  {
    title: '21IPC501J Research Methodology & Publication Ethics',
    description: 'Research methods and ethical considerations in academic publishing.',
    shortDescription: 'Research methods and ethics',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
    priceCredits: 0,
    difficulty: 'intermediate',
    duration: 30,
    published: true,
    courseCode: '21IPC501J'
  },
  {
    title: 'Pre Work',
    description: 'Preparatory materials and setup for the program.',
    shortDescription: 'Program preparation materials',
    thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
    priceCredits: 0,
    difficulty: 'beginner',
    duration: 5,
    published: true,
    courseCode: null
  },
  // Additional courses for instructors
  {
    title: 'Advanced Deep Learning',
    description: 'Advanced neural network architectures and deep learning techniques.',
    shortDescription: 'Deep learning and neural networks',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
    priceCredits: 50,
    difficulty: 'advanced',
    duration: 60,
    published: true,
    courseCode: 'ADL2024'
  },
  {
    title: 'Data Science Fundamentals',
    description: 'Comprehensive introduction to data science concepts and tools.',
    shortDescription: 'Data science basics and tools',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
    priceCredits: 30,
    difficulty: 'intermediate',
    duration: 50,
    published: true,
    courseCode: 'DSF2024'
  },
  {
    title: 'Python for Data Analysis',
    description: 'Learn Python programming for data analysis and visualization.',
    shortDescription: 'Python data analysis',
    thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800',
    priceCredits: 25,
    difficulty: 'intermediate',
    duration: 40,
    published: true,
    courseCode: 'PDA2024'
  },
  {
    title: 'Statistical Computing with R',
    description: 'Statistical analysis and computing using R programming language.',
    shortDescription: 'R programming for statistics',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
    priceCredits: 35,
    difficulty: 'intermediate',
    duration: 45,
    published: true,
    courseCode: 'SCR2024'
  },
  {
    title: 'Big Data Analytics',
    description: 'Processing and analyzing large-scale datasets using modern tools.',
    shortDescription: 'Big data processing and analysis',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
    priceCredits: 60,
    difficulty: 'advanced',
    duration: 70,
    published: true,
    courseCode: 'BDA2024'
  }
];

const modules = [
  {
    title: 'Introduction to Web Development',
    description: 'Get started with the basics of web development',
    order: 1
  },
  {
    title: 'HTML & CSS Fundamentals',
    description: 'Learn the building blocks of web pages',
    order: 2
  },
  {
    title: 'JavaScript Basics',
    description: 'Master JavaScript programming fundamentals',
    order: 3
  },
  {
    title: 'React Fundamentals',
    description: 'Build modern user interfaces with React',
    order: 4
  },
  {
    title: 'Backend Development',
    description: 'Create server-side applications with Node.js',
    order: 5
  }
];

const lessons = [
  {
    title: 'Welcome to the Course',
    description: 'Introduction and course overview',
    order: 1
  },
  {
    title: 'Setting Up Your Development Environment',
    description: 'Install and configure your development tools',
    order: 2
  },
  {
    title: 'HTML Basics',
    description: 'Learn the fundamentals of HTML',
    order: 3
  },
  {
    title: 'CSS Styling',
    description: 'Make your websites beautiful with CSS',
    order: 4
  },
  {
    title: 'JavaScript Fundamentals',
    description: 'Programming basics with JavaScript',
    order: 5
  }
];

const sessions = [
  {
    title: 'Residency Schedule',
    description: 'Residency program overview and scheduling',
    scheduledAt: new Date('2025-08-09T10:00:00Z'),
    duration: 240, // 4 hours
    zoomMeetingId: 'residency-2025',
    joinUrl: 'https://zoom.us/j/residency-2025',
    status: 'scheduled',
    type: 'residency'
  },
  {
    title: 'Inferential Statistics by Shankar DK',
    description: 'Online class covering statistical inference methods',
    scheduledAt: new Date('2025-08-10T09:00:00Z'),
    duration: 240, // 4 hours
    zoomMeetingId: 'stats-21csc529t',
    joinUrl: 'https://zoom.us/j/stats-21csc529t',
    status: 'completed',
    type: 'live-class',
    hasRecording: true
  },
  {
    title: 'Machine Learning Algorithm by Dr Vijayakumar',
    description: 'Online class covering ML algorithms and applications',
    scheduledAt: new Date('2025-08-10T14:00:00Z'),
    duration: 240, // 4 hours
    zoomMeetingId: 'ml-21csc555j',
    joinUrl: 'https://zoom.us/j/ml-21csc555j',
    status: 'completed',
    type: 'live-class',
    hasRecording: true
  },
  {
    title: 'JavaScript Fundamentals Quiz',
    description: 'Assessment of JavaScript programming fundamentals',
    scheduledAt: new Date('2025-08-12T15:00:00Z'),
    duration: 30,
    zoomMeetingId: null,
    joinUrl: null,
    status: 'scheduled',
    type: 'quiz'
  },
  {
    title: 'React Project Submission',
    description: 'Final project submission and review',
    scheduledAt: new Date('2025-08-15T23:59:00Z'),
    duration: 15, // Minimum duration for assignments
    zoomMeetingId: null,
    joinUrl: null,
    status: 'scheduled',
    type: 'assignment'
  },
  // Additional sessions for new courses
  {
    title: 'Deep Learning Workshop',
    description: 'Hands-on workshop on neural network architectures',
    scheduledAt: new Date('2025-08-20T10:00:00Z'),
    duration: 180, // 3 hours
    zoomMeetingId: 'dl-workshop-2024',
    joinUrl: 'https://zoom.us/j/dl-workshop-2024',
    status: 'scheduled',
    type: 'live-class'
  },
  {
    title: 'Data Science Project Review',
    description: 'Review and feedback session for data science projects',
    scheduledAt: new Date('2025-08-22T14:00:00Z'),
    duration: 120, // 2 hours
    zoomMeetingId: 'ds-review-2024',
    joinUrl: 'https://zoom.us/j/ds-review-2024',
    status: 'scheduled',
    type: 'live-class'
  },
  {
    title: 'Python Programming Quiz',
    description: 'Assessment of Python programming skills',
    scheduledAt: new Date('2025-08-25T16:00:00Z'),
    duration: 45,
    zoomMeetingId: null,
    joinUrl: null,
    status: 'scheduled',
    type: 'quiz'
  },
  {
    title: 'R Statistics Assignment',
    description: 'Statistical analysis assignment using R',
    scheduledAt: new Date('2025-08-28T23:59:00Z'),
    duration: 30,
    zoomMeetingId: null,
    joinUrl: null,
    status: 'scheduled',
    type: 'assignment'
  },
  {
    title: 'Big Data Analytics Discussion',
    description: 'Discussion on big data processing techniques',
    scheduledAt: new Date('2025-08-30T11:00:00Z'),
    duration: 90, // 1.5 hours
    zoomMeetingId: 'bda-discussion-2024',
    joinUrl: 'https://zoom.us/j/bda-discussion-2024',
    status: 'scheduled',
    type: 'discussion'
  }
];

const notifications = [
  {
    title: 'Welcome to Axess Upskill!',
    message: 'Thank you for joining our learning platform. Start exploring courses and begin your learning journey.',
    type: 'system',
    payload: {}
  },
  {
    title: 'New Course Available',
    message: 'Check out our new "Advanced React Development" course!',
    type: 'course_update',
    payload: {}
  },
  {
    title: 'Live Session Reminder',
    message: 'Your live Q&A session starts in 1 hour. Don\'t forget to join!',
    type: 'session_reminder',
    payload: {}
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      Category.deleteMany({}),
      Module.deleteMany({}),
      Lesson.deleteMany({}),
      Enrollment.deleteMany({}),
      Session.deleteMany({}),
      Chat.deleteMany({}),
      Notification.deleteMany({})
    ]);
    console.log('✅ Cleared existing data');

    // Seed categories
    console.log('📂 Seeding categories...');
    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ Created ${createdCategories.length} categories`);

    // Seed users
    console.log('👥 Seeding users...');
    const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 12)
      }))
    );
    const createdUsers = await User.insertMany(hashedUsers);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Get instructor users
    const instructors = createdUsers.filter(user => user.role === 'instructor');
    const learners = createdUsers.filter(user => user.role === 'learner');

    // Seed courses
    console.log('📚 Seeding courses...');
    const courseInstructorMapping = [
      { courseIndex: 0, instructorName: 'Program Coordinator', categoryName: 'Overview' },
      { courseIndex: 1, instructorName: 'Dr. AI Specialist', categoryName: 'Computer Science' },
      { courseIndex: 2, instructorName: 'Shankar DK', categoryName: 'Statistics' },
      { courseIndex: 3, instructorName: 'Dr Vijayakumar', categoryName: 'Machine Learning' },
      { courseIndex: 4, instructorName: 'Dr. Research Ethics', categoryName: 'Research' },
      { courseIndex: 5, instructorName: 'Program Team', categoryName: 'Preparation' },
      { courseIndex: 6, instructorName: 'Dr. AI Specialist', categoryName: 'Machine Learning' },
      { courseIndex: 7, instructorName: 'Shankar DK', categoryName: 'Statistics' },
      { courseIndex: 8, instructorName: 'Dr. AI Specialist', categoryName: 'Computer Science' },
      { courseIndex: 9, instructorName: 'Shankar DK', categoryName: 'Statistics' },
      { courseIndex: 10, instructorName: 'Dr Vijayakumar', categoryName: 'Machine Learning' }
    ];

    const coursesWithInstructors = courses.map((course, index) => {
      const mapping = courseInstructorMapping[index];
      if (!mapping) {
        throw new Error(`No mapping found for course index ${index}`);
      }
      const instructor = createdUsers.find(user => user.name === mapping.instructorName);
      const category = createdCategories.find(cat => cat.name === mapping.categoryName);
      
      return {
        ...course,
        instructorId: instructor?._id,
        categoryId: category?._id
      };
    });
    const createdCourses = await Course.insertMany(coursesWithInstructors);
    console.log(`✅ Created ${createdCourses.length} courses`);

    // Seed modules
    console.log('📑 Seeding modules...');
    const modulesWithCourses = [];
    for (const course of createdCourses) {
      for (const module of modules) {
        modulesWithCourses.push({
          ...module,
          courseId: course._id
        });
      }
    }
    const createdModules = await Module.insertMany(modulesWithCourses);
    console.log(`✅ Created ${createdModules.length} modules`);

    // Seed lessons
    console.log('📖 Seeding lessons...');
    const lessonsWithModules = [];
    for (const module of createdModules) {
      for (const lesson of lessons) {
        lessonsWithModules.push({
          ...lesson,
          moduleId: module._id
        });
      }
    }
    const createdLessons = await Lesson.insertMany(lessonsWithModules);
    console.log(`✅ Created ${createdLessons.length} lessons`);

    // Seed sessions
    console.log('🎥 Seeding sessions...');
    const sessionMapping = [
      { sessionIndex: 0, courseTitle: 'Program Overview', instructorName: 'Program Coordinator' },
      { sessionIndex: 1, courseTitle: '21CSC529T Inferential Statistics', instructorName: 'Shankar DK' },
      { sessionIndex: 2, courseTitle: '21CSC555J Machine Learning Algorithm', instructorName: 'Dr Vijayakumar' },
      { sessionIndex: 3, courseTitle: '21CSC569T Fundamentals of Artificial Intelligence', instructorName: 'Dr. AI Specialist' },
      { sessionIndex: 4, courseTitle: '21CSC569T Fundamentals of Artificial Intelligence', instructorName: 'Dr. AI Specialist' },
      { sessionIndex: 5, courseTitle: 'Advanced Deep Learning', instructorName: 'Dr. AI Specialist' },
      { sessionIndex: 6, courseTitle: 'Data Science Fundamentals', instructorName: 'Shankar DK' },
      { sessionIndex: 7, courseTitle: 'Python for Data Analysis', instructorName: 'Dr. AI Specialist' },
      { sessionIndex: 8, courseTitle: 'Statistical Computing with R', instructorName: 'Shankar DK' },
      { sessionIndex: 9, courseTitle: 'Big Data Analytics', instructorName: 'Dr Vijayakumar' }
    ];

    const sessionsWithCourses = sessions.map((session, index) => {
      const mapping = sessionMapping[index];
      if (!mapping) {
        throw new Error(`No mapping found for session index ${index}`);
      }
      const course = createdCourses.find(c => c.title === mapping.courseTitle);
      const instructor = createdUsers.find(user => user.name === mapping.instructorName);
      
      return {
        ...session,
        courseId: course?._id,
        instructorId: instructor?._id
      };
    });
    const createdSessions = await Session.insertMany(sessionsWithCourses);
    console.log(`✅ Created ${createdSessions.length} sessions`);

    // Seed enrollments
    console.log('🎓 Seeding enrollments...');
    const enrollmentProgress = [
      { courseTitle: 'Program Overview', progress: 20 },
      { courseTitle: '21CSC569T Fundamentals of Artificial Intelligence', progress: 1 },
      { courseTitle: '21CSC529T Inferential Statistics', progress: 0 },
      { courseTitle: '21CSC555J Machine Learning Algorithm', progress: 0 },
      { courseTitle: '21IPC501J Research Methodology & Publication Ethics', progress: 0 },
      { courseTitle: 'Pre Work', progress: 0 }
    ];

    const enrollments = [];
    for (const learner of learners) {
      for (const course of createdCourses) {
        const progressData = enrollmentProgress.find(p => p.courseTitle === course.title);
        enrollments.push({
          userId: learner._id,
          courseId: course._id,
          status: 'active',
          enrolledAt: new Date(),
          creditsPaid: course.priceCredits,
          progress: {
            currentLesson: null,
            completedLessons: [],
            timeSpent: Math.floor(Math.random() * 120), // Random time spent
            completionPercentage: progressData?.progress || 0,
            lastAccessedAt: new Date()
          }
        });
      }
    }
    const createdEnrollments = await Enrollment.insertMany(enrollments);
    console.log(`✅ Created ${createdEnrollments.length} enrollments`);

    // Seed notifications
    console.log('🔔 Seeding notifications...');
    const notificationsWithUsers = [];
    for (const user of createdUsers) {
      for (const notification of notifications) {
        notificationsWithUsers.push({
          ...notification,
          userId: user._id,
          readAt: Math.random() > 0.5 ? new Date() : undefined // Random read status
        });
      }
    }
    const createdNotifications = await Notification.insertMany(notificationsWithUsers);
    console.log(`✅ Created ${createdNotifications.length} notifications`);

    // Seed chat messages
    console.log('💬 Seeding chat messages...');
    const chatMessages = [];
    
    // Realistic chat messages for different scenarios
    const realisticMessages = [
      "Hi everyone! I'm excited to start this course.",
      "Does anyone have experience with AI before?",
      "Great question! I've been working with machine learning for about 2 years.",
      "The assignment deadline is this Friday, right?",
      "I'm having trouble with the latest exercise. Can someone help?",
      "Sure! I can help you with that. What specific part are you stuck on?",
      "Thanks for the clarification, that makes much more sense now!",
      "Has anyone completed the project yet?",
      "I'm about 70% done with mine. It's quite challenging!",
      "The instructor mentioned we'll have a live session tomorrow.",
      "Looking forward to the Q&A session!",
      "Does anyone want to form a study group?",
      "That's a great idea! I'm in.",
      "Count me in too! We can meet virtually.",
      "The course material is really well structured.",
      "I agree! The practical examples are very helpful.",
      "Has anyone tried implementing the algorithm we learned today?",
      "Yes! I got it working after a few attempts.",
      "Any tips for the upcoming quiz?",
      "Focus on the key concepts we covered in the last module.",
      "Good luck everyone!",
      "Thanks! You too!",
      "The course is getting really interesting now.",
      "I'm learning so much from the discussions here.",
      "This community is really supportive!",
      "Can't wait for the next module!",
      "The instructor is really knowledgeable.",
      "I appreciate how patient they are with our questions.",
      "Has anyone started working on the final project?",
      "I'm brainstorming ideas for mine.",
      "The course is exceeding my expectations!",
      "Same here! Much better than I anticipated.",
      "Anyone else staying up late to finish assignments? 😅",
      "Haha, guilty! But it's worth it.",
      "The practical applications are really eye-opening.",
      "I'm already thinking about how to apply this at work.",
      "That's awesome! What field are you in?",
      "I work in healthcare, so AI applications are really relevant.",
      "Fascinating! I'm in finance, so different applications but equally exciting.",
      "The cross-disciplinary nature of this course is amazing.",
      "Absolutely! Learning from different perspectives is valuable.",
      "Has anyone attended the office hours yet?",
      "Yes, they're very helpful for clarifying concepts.",
      "I should definitely attend the next one.",
      "The instructor mentioned additional resources in the last session.",
      "I'll check those out this weekend.",
      "The course pace is perfect for me.",
      "I agree, it's challenging but manageable.",
      "Looking forward to the group project!",
      "Me too! Team collaboration will be fun.",
      "The course has really improved my understanding of AI.",
      "Same here! I feel much more confident now.",
      "Thanks everyone for making this such a great learning experience!",
      "Cheers to that! 🎉",
      "Can't believe we're almost done with the course!",
      "Time flies when you're learning!",
      "The final presentation will be exciting.",
      "I'm nervous but excited!",
      "You'll do great! We've all learned so much.",
      "This has been an amazing journey!",
      "Agreed! The course community is fantastic.",
      "Looking forward to staying in touch after the course!",
      "Definitely! Let's keep the learning going.",
      "The instructor's feedback has been really valuable.",
      "I've learned so much from the peer discussions too.",
      "The course has exceeded all my expectations!",
      "Same here! Highly recommend to others.",
      "What's everyone planning to do next?",
      "I'm thinking of taking the advanced course!",
      "Great idea! I might do the same.",
      "The course has opened up so many opportunities.",
      "Absolutely! The skills are very marketable.",
      "Thanks everyone for the great discussions!",
      "It's been a pleasure learning with you all!",
      "Good luck with your future projects!",
      "You too! Keep in touch!",
      "The course has been transformative for me.",
      "Same here! Life-changing experience.",
      "Looking forward to applying these skills!",
      "The practical knowledge gained is invaluable.",
      "This course has been the highlight of my year!",
      "Couldn't agree more! Amazing experience.",
      "The instructor's passion is really inspiring.",
      "It makes such a difference when they're enthusiastic!",
      "The course structure is really well thought out.",
      "The progression from basics to advanced topics is perfect.",
      "I feel much more confident about AI now.",
      "The hands-on projects really helped solidify the concepts.",
      "The peer learning aspect has been fantastic.",
      "Learning from each other's experiences is so valuable.",
      "The course has given me a new perspective on technology.",
      "It's amazing how AI is transforming various industries.",
      "The real-world applications we discussed are fascinating.",
      "I'm excited to see where this field goes!",
      "The course has been a game-changer for my career.",
      "It's opened up so many new opportunities!",
      "The networking aspect has been great too.",
      "Meeting like-minded people has been wonderful.",
      "The course has been worth every minute!",
      "Absolutely! Time well spent.",
      "Looking forward to the certificate ceremony!",
      "It will be a proud moment for all of us!",
      "The course has been an incredible journey.",
      "Here's to continued learning and growth! 🚀",
      "The future of AI is so exciting!",
      "We're lucky to be learning this now.",
      "The course has been a fantastic investment in myself.",
      "Couldn't have said it better!",
      "Thanks to everyone who made this possible!",
      "The instructor, the community, everything has been perfect.",
      "This course has been life-changing!",
      "Looking forward to what comes next!",
      "The learning never stops! 📚",
      "Cheers to continuous improvement! 🎯",
      "The course has been absolutely amazing!",
      "Here's to new beginnings and opportunities! 🌟"
    ];

    // Create chat messages for each course
    for (const course of createdCourses) {
      // Get course instructor - just get any instructor
      const courseInstructor = createdUsers.find(user => 
        user.role === 'instructor'
      );
      
      // Get some students enrolled in this course
      const courseStudents = createdUsers.filter(user => 
        user.role === 'learner'
      ).slice(0, 5); // Take first 5 students

      // Add instructor welcome message
      if (courseInstructor) {
        chatMessages.push({
          courseId: course._id,
          fromUserId: courseInstructor._id,
          message: `Welcome to ${course.title}! I'm excited to guide you through this journey. Feel free to ask questions and engage with your fellow learners.`,
          type: 'text',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        });
      }

      // Add student messages
      for (let i = 0; i < Math.min(realisticMessages.length, 15); i++) {
        const randomStudent = courseStudents[Math.floor(Math.random() * courseStudents.length)];
        if (randomStudent) {
          chatMessages.push({
            courseId: course._id,
            fromUserId: randomStudent._id,
            message: realisticMessages[i],
            type: 'text',
            createdAt: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000) // Spread over 6 days
          });
        }
      }

      // Add some instructor responses
      if (courseInstructor) {
        const instructorResponses = [
          "Great question! Let me clarify that for you.",
          "Excellent work on the assignment!",
          "I'm here to help if anyone has questions.",
          "The next module will cover this in more detail.",
          "Don't hesitate to reach out if you need assistance.",
          "I'm impressed with the level of engagement!",
          "Remember, there are no silly questions.",
          "The discussion is really insightful!",
          "I'll address this in the next live session.",
          "Keep up the great work everyone!"
        ];

        for (let i = 0; i < 5; i++) {
          chatMessages.push({
            courseId: course._id,
            fromUserId: courseInstructor._id,
            message: instructorResponses[i],
            type: 'text',
            createdAt: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000)
          });
        }
      }
    }

    const createdChatMessages = await Chat.insertMany(chatMessages);
    console.log(`✅ Created ${createdChatMessages.length} chat messages`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${createdCategories.length} categories`);
    console.log(`- ${createdUsers.length} users`);
    console.log(`- ${createdCourses.length} courses`);
    console.log(`- ${createdModules.length} modules`);
    console.log(`- ${createdLessons.length} lessons`);
    console.log(`- ${createdSessions.length} sessions`);
    console.log(`- ${createdEnrollments.length} enrollments`);
    console.log(`- ${createdNotifications.length} notifications`);
    console.log(`- ${createdChatMessages.length} chat messages`);

    console.log('\n🔑 Test Accounts:');
    console.log('Admin: admin@axessupskill.com / admin123');
    console.log('Instructor: jane@example.com / password123');
    console.log('Learner: john@example.com / password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
seedDatabase();
