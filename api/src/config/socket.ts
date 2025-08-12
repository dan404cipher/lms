import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

export const setupSocketIO = (io: SocketIOServer) => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error('Authentication error: Server configuration error'));
      }
      const decoded = (jwt.verify as any)(token, secret);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id?.toString() || '';
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Join user to course rooms they're enrolled in
    socket.on('join-course', (courseId: string) => {
      socket.join(`course:${courseId}`);
      console.log(`User ${socket.userId} joined course ${courseId}`);
    });

    // Leave course room
    socket.on('leave-course', (courseId: string) => {
      socket.leave(`course:${courseId}`);
      console.log(`User ${socket.userId} left course ${courseId}`);
    });

    // Handle chat messages
    socket.on('send-message', async (data: any) => {
      try {
        const { courseId, message, type = 'text' } = data;
        
        // Save message to database (implement in chat service)
        // const savedMessage = await chatService.saveMessage({
        //   courseId,
        //   fromUserId: socket.userId,
        //   message,
        //   type
        // });

        // Broadcast to course room
        io.to(`course:${courseId}`).emit('new-message', {
          courseId,
          fromUserId: socket.userId,
          fromUserName: socket.user?.name,
          message,
          type,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (courseId: string) => {
      socket.to(`course:${courseId}`).emit('user-typing', {
        courseId,
        userId: socket.userId,
        userName: socket.user?.name
      });
    });

    socket.on('typing-stop', (courseId: string) => {
      socket.to(`course:${courseId}`).emit('user-stop-typing', {
        courseId,
        userId: socket.userId
      });
    });

    // Handle presence
    socket.on('set-presence', (status: 'online' | 'away' | 'offline') => {
      socket.user = { ...socket.user, presence: status };
      io.emit('user-presence', {
        userId: socket.userId,
        status,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // Update presence to offline
      io.emit('user-presence', {
        userId: socket.userId,
        status: 'offline',
        timestamp: new Date()
      });
    });
  });

  return io;
};
