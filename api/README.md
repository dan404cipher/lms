# LMS Backend API

A comprehensive Learning Management System (LMS) backend built with Node.js, Express, TypeScript, and MongoDB.

## Features

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- User registration, login, and profile management
- Password reset functionality
- Email verification

### 📚 Course Management
- Complete CRUD operations for courses
- Module and lesson management
- File upload support (S3 integration)
- Course publishing workflow
- Course categories and tags
- Search and filtering capabilities

### 👥 User Management
- Multi-role support (Learner, Instructor, Admin, Super Admin)
- User profiles and preferences
- Credit system for course enrollment
- User analytics and progress tracking

### 🎓 Enrollment System
- Course enrollment with credit deduction
- Progress tracking
- Lesson completion tracking
- Enrollment status management

### 🎥 Live Sessions
- Zoom integration for live sessions
- Session scheduling and management
- Attendance tracking
- Session recording support

### 💬 Real-time Communication
- Course-level chat rooms
- Direct messaging between users
- Real-time notifications
- Typing indicators and presence

### 📧 Notifications
- In-app notifications
- Email notifications
- Push notifications (configurable)
- Notification preferences

### 📊 Analytics & Reporting
- Course analytics
- User progress reports
- Enrollment statistics
- Completion rates

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt
- **File Storage**: AWS S3
- **Real-time**: Socket.IO
- **Email**: Nodemailer
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- AWS S3 account (for file storage)
- SMTP server (for email notifications)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/lms
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_EXPIRES_IN=7d
   
   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your-s3-bucket-name
   
   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-email-password
   
   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Courses
- `GET /api/courses` - Get all published courses
- `GET /api/courses/:id` - Get course details
- `POST /api/courses` - Create new course (Instructor/Admin)
- `PUT /api/courses/:id` - Update course (Instructor/Admin)
- `DELETE /api/courses/:id` - Delete course (Instructor/Admin)
- `POST /api/courses/:id/publish` - Publish course (Instructor/Admin)

### Modules & Lessons
- `GET /api/courses/:id/modules` - Get course modules
- `POST /api/courses/:courseId/modules` - Create module (Instructor/Admin)
- `PUT /api/courses/:courseId/modules/:moduleId` - Update module (Instructor/Admin)
- `DELETE /api/courses/:courseId/modules/:moduleId` - Delete module (Instructor/Admin)
- `GET /api/courses/:courseId/modules/:moduleId/lessons` - Get module lessons
- `POST /api/courses/:courseId/modules/:moduleId/lessons` - Create lesson (Instructor/Admin)
- `PUT /api/courses/:courseId/modules/:moduleId/lessons/:lessonId` - Update lesson (Instructor/Admin)
- `DELETE /api/courses/:courseId/modules/:moduleId/lessons/:lessonId` - Delete lesson (Instructor/Admin)

### Enrollments
- `POST /api/enrollments` - Enroll in a course
- `GET /api/enrollments` - Get user enrollments
- `GET /api/enrollments/:id` - Get enrollment details
- `PUT /api/enrollments/:id/progress` - Update progress
- `POST /api/enrollments/:id/lessons/:lessonId/complete` - Mark lesson complete

### Sessions
- `GET /api/sessions` - Get sessions
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions` - Create session (Instructor/Admin)
- `PUT /api/sessions/:id` - Update session (Instructor/Admin)
- `DELETE /api/sessions/:id` - Delete session (Instructor/Admin)
- `POST /api/sessions/:id/join` - Join session

### Chat
- `GET /api/chat/course/:courseId` - Get course chat info
- `GET /api/chat/course/:courseId/messages` - Get course messages
- `POST /api/chat/course/:courseId/messages` - Send message
- `GET /api/chat/direct/:userId` - Get direct messages
- `PUT /api/chat/messages/read` - Mark messages as read

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/notifications/settings` - Get notification settings
- `PUT /api/notifications/settings` - Update notification settings

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PUT /api/users/:id/role` - Update user role

## Database Models

### User
- Basic user information (name, email, password)
- Role-based access control
- Profile information (avatar, bio, social links)
- Credit system
- Notification preferences

### Course
- Course details (title, description, thumbnail)
- Instructor assignment
- Pricing and enrollment settings
- Course statistics
- Publishing status

### Module
- Course organization structure
- Module ordering
- Learning objectives

### Lesson
- Individual learning content
- Multiple content types (video, PDF, SCORM, HTML)
- Lesson resources
- Duration tracking

### Enrollment
- Student-course relationship
- Progress tracking
- Completion status
- Credit transactions

### Session
- Live session management
- Zoom integration
- Attendance tracking
- Session recordings

### Chat
- Course-level and direct messaging
- Message types (text, image, file)
- Read status tracking

### Notification
- User notifications
- Multiple notification types
- Read status tracking

## Real-time Features

The application uses Socket.IO for real-time features:

- **Chat**: Real-time messaging in course rooms
- **Presence**: User online/offline status
- **Typing indicators**: Show when users are typing
- **Notifications**: Real-time notification delivery

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Rate Limiting**: Prevent abuse with request limiting
- **CORS**: Cross-origin resource sharing protection
- **Helmet**: Security headers
- **Input Validation**: Request validation with express-validator
- **Role-based Access Control**: Granular permission system

## File Upload

The system supports file uploads for:
- Course thumbnails
- Lesson content (videos, PDFs, SCORM packages)
- User avatars
- Chat attachments

Files are stored in AWS S3 with proper access controls.

## Email System

The application sends emails for:
- Welcome messages
- Password reset requests
- Course enrollment confirmations
- Session reminders
- Course completion certificates

## Development

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Code Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── utils/           # Utility functions
└── index.ts         # Application entry point
```

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
Ensure all required environment variables are set in production:
- Database connection string
- JWT secrets
- AWS credentials
- SMTP settings
- Frontend URL

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
