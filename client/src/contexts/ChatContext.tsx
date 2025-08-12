import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface ChatContextType {
  currentCourseId: string | null;
  setCurrentCourseId: (courseId: string | null) => void;
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Reset chat state when user changes
  useEffect(() => {
    if (!user) {
      setCurrentCourseId(null);
      setShowChat(false);
      setUnreadCount(0);
    }
  }, [user]);

  return (
    <ChatContext.Provider value={{
      currentCourseId,
      setCurrentCourseId,
      showChat,
      setShowChat,
      unreadCount,
      setUnreadCount
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
