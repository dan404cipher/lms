# LMS Frontend-Backend Integration Guide

This guide will help you integrate the React frontend with the TypeScript backend for the complete LMS system.

## 🚀 Quick Start

### 1. Backend Setup

```bash
# Navigate to backend directory
cd api

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Update .env with your configuration
# (See environment variables section below)

# Build the project
npm run build

# Setup database with default data
npm run setup

# Start development server
npm run dev
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔧 Environment Variables

### Backend (.env file in api/ directory)

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

# AWS S3 Configuration (for file uploads)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Limits
MAX_FILE_SIZE=10485760
```

### Frontend (.env file in client/ directory)

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_NAME=LMS Platform
```

## 🔌 API Integration

### 1. Authentication Integration

Create an authentication service in the frontend:

```typescript
// client/src/services/authService.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'learner' | 'instructor';
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      credits: number;
    };
    token: string;
    refreshToken: string;
  };
}

class AuthService {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/auth/login`, data);
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/auth/refresh-token`, {
      refreshToken
    });
    return response.data;
  }

  async getProfile(): Promise<any> {
    const response = await axios.get(`${API_URL}/auth/profile`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`
    };
  }
}

export default new AuthService();
```

### 2. Course Integration

```typescript
// client/src/services/courseService.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

class CourseService {
  async getCourses(params?: any) {
    const response = await axios.get(`${API_URL}/courses`, { params });
    return response.data;
  }

  async getCourse(id: string) {
    const response = await axios.get(`${API_URL}/courses/${id}`);
    return response.data;
  }

  async createCourse(data: any) {
    const response = await axios.post(`${API_URL}/courses`, data, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async updateCourse(id: string, data: any) {
    const response = await axios.put(`${API_URL}/courses/${id}`, data, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async deleteCourse(id: string) {
    const response = await axios.delete(`${API_URL}/courses/${id}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`
    };
  }
}

export default new CourseService();
```

### 3. Enrollment Integration

```typescript
// client/src/services/enrollmentService.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

class EnrollmentService {
  async enrollInCourse(courseId: string) {
    const response = await axios.post(`${API_URL}/enrollments`, {
      courseId
    }, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getEnrollments() {
    const response = await axios.get(`${API_URL}/enrollments`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async updateProgress(enrollmentId: string, lessonId: string, timeSpent: number) {
    const response = await axios.put(`${API_URL}/enrollments/${enrollmentId}/progress`, {
      lessonId,
      timeSpent
    }, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`
    };
  }
}

export default new EnrollmentService();
```

## 🔄 Real-time Integration

### Socket.IO Integration

```typescript
// client/src/services/socketService.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: {
        token
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinCourse(courseId: string) {
    if (this.socket) {
      this.socket.emit('join-course', courseId);
    }
  }

  leaveCourse(courseId: string) {
    if (this.socket) {
      this.socket.emit('leave-course', courseId);
    }
  }

  sendMessage(courseId: string, message: string, type: string = 'text') {
    if (this.socket) {
      this.socket.emit('send-message', {
        courseId,
        message,
        type
      });
    }
  }

  onNewMessage(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('new-message', callback);
    }
  }

  onUserTyping(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user-typing', callback);
    }
  }

  onUserStopTyping(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user-stop-typing', callback);
    }
  }
}

export default new SocketService();
```

## 🎯 React Components Integration

### Authentication Context

```typescript
// client/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

interface AuthContextType {
  user: any;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authService.getProfile()
        .then(response => {
          setUser(response.data.user);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    setUser(response.data.user);
  };

  const register = async (data: any) => {
    const response = await authService.register(data);
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    setUser(response.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Course List Component

```typescript
// client/src/components/CourseList.tsx
import React, { useState, useEffect } from 'react';
import courseService from '../services/courseService';

interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  instructorId: {
    name: string;
  };
  stats: {
    enrollments: number;
    averageRating: number;
  };
}

const CourseList: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await courseService.getCourses();
      setCourses(response.data.courses);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading courses...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <div key={course._id} className="border rounded-lg p-4">
          <img src={course.thumbnail} alt={course.title} className="w-full h-48 object-cover rounded" />
          <h3 className="text-xl font-semibold mt-2">{course.title}</h3>
          <p className="text-gray-600 mt-1">{course.description}</p>
          <p className="text-sm text-gray-500 mt-2">By {course.instructorId.name}</p>
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-gray-500">
              {course.stats.enrollments} students enrolled
            </span>
            <span className="text-sm text-gray-500">
              ⭐ {course.stats.averageRating.toFixed(1)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CourseList;
```

## 🔐 Protected Routes

```typescript
// client/src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

## 📱 App Routing

```typescript
// client/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CourseList from './pages/CourseList';
import CourseDetail from './pages/CourseDetail';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<CourseList />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/instructor" 
            element={
              <ProtectedRoute roles={['instructor', 'admin', 'super_admin']}>
                <InstructorDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
```

## 🧪 Testing the Integration

### 1. Test Authentication

```bash
# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "learner"
  }'

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 2. Test Course Creation

```bash
# Get auth token from login response
TOKEN="your-jwt-token-here"

# Create a course
curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Course",
    "description": "A test course for integration",
    "shortDescription": "Test course",
    "categoryId": "category-id-here",
    "priceCredits": 10,
    "difficulty": "beginner"
  }'
```

### 3. Test Course Enrollment

```bash
# Enroll in a course
curl -X POST http://localhost:5000/api/enrollments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "courseId": "course-id-here"
  }'
```

## 🚀 Deployment

### Backend Deployment

1. **Build the project:**
   ```bash
   cd api
   npm run build
   ```

2. **Set production environment variables**

3. **Deploy to your preferred platform:**
   - Heroku
   - AWS EC2
   - DigitalOcean
   - Railway
   - Render

### Frontend Deployment

1. **Update API URL in production:**
   ```env
   VITE_API_URL=https://your-backend-domain.com/api
   VITE_SOCKET_URL=https://your-backend-domain.com
   ```

2. **Build the project:**
   ```bash
   cd client
   npm run build
   ```

3. **Deploy to:**
   - Vercel
   - Netlify
   - AWS S3
   - GitHub Pages

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Ensure `FRONTEND_URL` is set correctly in backend `.env`
   - Check that CORS middleware is properly configured

2. **Authentication Issues:**
   - Verify JWT secret is set
   - Check token expiration settings
   - Ensure proper token storage in frontend

3. **Database Connection:**
   - Verify MongoDB connection string
   - Check MongoDB service is running
   - Ensure database permissions

4. **File Upload Issues:**
   - Verify AWS S3 credentials
   - Check S3 bucket permissions
   - Ensure proper file size limits

### Debug Mode

Enable debug logging in backend:

```env
NODE_ENV=development
DEBUG=app:*
```

## 📚 Additional Resources

- [Backend API Documentation](./api/README.md)
- [Frontend Component Library](./client/src/components/ui/)
- [Database Schema](./api/src/models/)
- [API Endpoints](./api/src/routes/)

## 🤝 Support

For integration issues or questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check the console for error messages
4. Verify environment variables are set correctly
