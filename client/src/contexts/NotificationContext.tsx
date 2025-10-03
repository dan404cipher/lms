import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import socketService from '../services/socketService';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  type: 'session_start' | 'session_end' | 'course_update' | 'session_created' | 'session_updated';
  title: string;
  message: string;
  courseId: string;
  courseTitle: string;
  sessionId?: string;
  sessionTitle?: string;
  instructorId?: string;
  instructorName?: string;
  timestamp: string;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  addNotification: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      const parsed = JSON.parse(savedNotifications);
      setNotifications(parsed);
      setUnreadCount(parsed.filter((n: Notification) => !n.read).length);
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Handle new notifications from socket
  const handleNewNotification = useCallback((notification: Notification) => {
    const newNotification = {
      ...notification,
      id: `${notification.type}-${notification.courseId}-${Date.now()}`,
      read: false,
      timestamp: new Date(notification.timestamp).toISOString()
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast notification
    toast({
      title: newNotification.title,
      description: newNotification.message,
      action: newNotification.type === 'session_start' && newNotification.data?.joinUrl ? (
        <button
          onClick={() => window.open(newNotification.data.joinUrl, '_blank')}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Join Session
        </button>
      ) : undefined,
    });
  }, [toast]);

  // Set up socket listeners when user is authenticated
  useEffect(() => {
    if (user) {
      socketService.onNotification(handleNewNotification);
      
      return () => {
        socketService.offNotification(handleNewNotification);
      };
    }
  }, [user, handleNewNotification]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    const newNotification = {
      ...notification,
      id: `${notification.type}-${notification.courseId}-${Date.now()}`,
      read: false,
      timestamp: new Date(notification.timestamp).toISOString()
    };
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

