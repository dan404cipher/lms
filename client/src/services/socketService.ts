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

  // Notification handlers
  onNotification(callback: (notification: any) => void) {
    if (this.socket) {
      this.socket.on('notification', callback);
    }
  }

  // Remove notification listener
  offNotification(callback: (notification: any) => void) {
    if (this.socket) {
      this.socket.off('notification', callback);
    }
  }

  // Get socket instance for direct access
  getSocket() {
    return this.socket;
  }
}

export default new SocketService();
