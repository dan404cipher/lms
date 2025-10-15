import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables FIRST before any other imports
const envPath = path.join(__dirname, '..', '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Debug environment variables
console.log('Environment variables loaded:');
console.log('ZOOM_ACCOUNT_ID:', process.env.ZOOM_ACCOUNT_ID);
console.log('ZOOM_CLIENT_ID:', process.env.ZOOM_CLIENT_ID);
console.log('ZOOM_CLIENT_SECRET:', process.env.ZOOM_CLIENT_SECRET ? '***' : 'Not set');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
// Import all models to ensure they are registered
import './models';
import authRoutes from './routes/auth';
import courseRoutes from './routes/courses';
import userRoutes from './routes/users';
import sessionRoutes from './routes/sessions';
import categoryRoutes from './routes/categories';
import activityRoutes from './routes/activities';

import chatRoutes from './routes/chat';
import connectionRoutes from './routes/connections';
import uploadRoutes from './routes/upload';
import notificationRoutes from './routes/notifications';
import instructorRoutes from './routes/instructor';
import recordingRoutes from './routes/recordings';
import adminRoutes from './routes/admin';
import { setupSocketIO } from './config/socket';

const app = express();
const server = createServer(app);

// Define allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
  'https://axessupskill.v-accel.ai'
];

// Add environment-specific origins
if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(process.env.CORS_ORIGIN);
}

// Socket.IO setup with consistent CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// CORS configuration - BEFORE other middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 200 // For legacy browser support
}));

// Handle preflight requests
app.options('*', cors());

// Security middleware with relaxed CSP for development
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...allowedOrigins],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "data:", "blob:"],
      frameAncestors: ["'self'", ...allowedOrigins]
    }
  } : false, // Disable CSP in development
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting - Disabled for development
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
// Only log in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ extended: true, limit: '2gb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cors: allowedOrigins
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/activities', activityRoutes);

app.use('/api/chat', chatRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/admin', adminRoutes);

// Serve uploaded files with enhanced CORS headers
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin as string) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Serve recording files with proper video streaming support (range requests)
app.get('/recordings/:filename', (req, res) => {
  const filename = req.params.filename;
  const recordingsDir = path.join(__dirname, '../recordings');
  const filePath = path.join(recordingsDir, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, message: 'Recording not found' });
    return;
  }

  // Get file stats
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Set CORS headers
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin as string) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Range, Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Accept-Ranges', 'bytes');

  if (range) {
    // Parse range header
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0] || '0', 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    // Create read stream for the requested range
    const fileStream = fs.createReadStream(filePath, { start, end });

    // Set headers for partial content
    res.status(206); // Partial Content
    res.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.header('Content-Length', chunksize.toString());
    res.header('Content-Type', 'video/mp4');

    // Pipe the stream
    fileStream.pipe(res);
  } else {
    // No range requested - send entire file
    res.header('Content-Length', fileSize.toString());
    res.header('Content-Type', 'video/mp4');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
});

// Handle OPTIONS for recordings
app.options('/recordings/:filename', (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin as string) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Range, Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Setup Socket.IO
setupSocketIO(io);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🌐 Allowed CORS origins:`, allowedOrigins);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;