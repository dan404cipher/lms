import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import socketService from '../services/socketService';
import globalChatService from '../services/globalChatService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { MessageCircle, X, Send, ChevronUp, ChevronDown, User, AtSign } from 'lucide-react';

interface Message {
  _id: string;
  fromUserId: {
    _id: string;
    name: string;
    profile?: {
      avatar?: string;
    };
  };
  message: string;
  type: 'text' | 'image' | 'file';
  createdAt: string;
}

const ChatFloater: React.FC = () => {
  const { user } = useAuth();
  const { currentCourseId, showChat, setShowChat, unreadCount, setUnreadCount } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [chatMode, setChatMode] = useState<'course' | 'direct'>('direct');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    // Connect to socket
    const token = localStorage.getItem('token');
    if (token) {
      const socket = socketService.connect(token);
      
      // Join course room if course is selected
      if (currentCourseId) {
        socketService.joinCourse(currentCourseId);
      }

      // Listen for new messages
      socketService.onNewMessage((data) => {
        setMessages(prev => [...prev, data]);
        if (!isOpen) {
          setUnreadCount(prev => prev + 1);
        }
        scrollToBottom();
      });

      // Listen for typing indicators
      socketService.onUserTyping((data) => {
        if (data.userId !== user._id) {
          setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
        }
      });

      socketService.onUserStopTyping((data) => {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      });

      // Load existing messages if course is selected
      if (currentCourseId) {
        loadMessages();
      }

      return () => {
        if (currentCourseId) {
          socketService.leaveCourse(currentCourseId);
        }
        socketService.disconnect();
      };
    }
  }, [user, currentCourseId, isOpen, setUnreadCount]);

  const loadMessages = async () => {
    if (!currentCourseId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/course/${currentCourseId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.data.messages);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

    const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      if (chatMode === 'course' && currentCourseId) {
        // Send course-specific message
        socketService.sendMessage(currentCourseId, newMessage.trim());
        
        const token = localStorage.getItem('token');
        await fetch(`${import.meta.env.VITE_API_URL}/chat/course/${currentCourseId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: newMessage.trim(),
            type: 'text'
          })
        });
      } else if (chatMode === 'direct' && recipientEmail) {
        // Send direct message by email
        const sentMessage = await globalChatService.sendDirectMessageByEmail(
          newMessage.trim(),
          recipientEmail
        );
        
        // Add to local state
        setMessages(prev => [...prev, sentMessage]);
      } else {
        // For testing - just add to local state
        const testMessage = {
          _id: Date.now().toString(),
          fromUserId: {
            _id: user._id,
            name: user.name,
            profile: { avatar: undefined }
          },
          message: newMessage.trim(),
          type: 'text' as const,
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, testMessage]);
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
    setShowChat(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setShowChat(false);
  };

  if (!user) return null;

  // Show dummy messages for testing when no course is selected
  const dummyMessages = [
    {
      _id: '1',
      fromUserId: {
        _id: 'instructor1',
        name: 'Dr. AI Specialist',
        profile: { avatar: undefined }
      },
      message: 'Welcome to the course! I\'m excited to guide you through this journey.',
      type: 'text' as const,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: '2',
      fromUserId: {
        _id: 'student1',
        name: 'John Doe',
        profile: { avatar: undefined }
      },
      message: 'Hi everyone! I\'m excited to start this course.',
      type: 'text' as const,
      createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: '3',
      fromUserId: {
        _id: 'student2',
        name: 'Jane Smith',
        profile: { avatar: undefined }
      },
      message: 'Does anyone have experience with AI before?',
      type: 'text' as const,
      createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: '4',
      fromUserId: {
        _id: 'instructor1',
        name: 'Dr. AI Specialist',
        profile: { avatar: undefined }
      },
      message: 'Great question! I\'m here to help everyone learn from the ground up.',
      type: 'text' as const,
      createdAt: new Date(Date.now() - 21 * 60 * 60 * 1000).toISOString()
    }
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
                 <Button
           onClick={handleOpen}
           size="lg"
           className="rounded-full shadow-lg bg-primary hover:bg-primary/90"
         >
           <MessageCircle className="w-5 h-5 mr-2" />
           Chat
           {unreadCount > 0 && (
             <Badge variant="destructive" className="ml-2">
               {unreadCount}
             </Badge>
           )}
         </Button>
      ) : (
                 <Card className="w-96 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
                             <CardTitle className="text-sm font-semibold flex items-center">
                 <MessageCircle className="w-4 h-4 mr-2" />
                 {chatMode === 'course' ? 'Course Chat' : 'Direct Message'}
               </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMinimize}
                  className="h-6 w-6 p-0"
                >
                  {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
                     </CardHeader>
           
           {!isMinimized && (
             <CardContent className="pt-0">
               {/* Chat Mode Tabs */}
               <div className="flex mb-3 border-b">
                 <Button
                   variant={chatMode === 'direct' ? 'default' : 'ghost'}
                   size="sm"
                   onClick={() => setChatMode('direct')}
                   className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                 >
                   <AtSign className="w-4 h-4 mr-2" />
                   Direct
                 </Button>
                 {currentCourseId && (
                   <Button
                     variant={chatMode === 'course' ? 'default' : 'ghost'}
                     size="sm"
                     onClick={() => setChatMode('course')}
                     className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                   >
                     <MessageCircle className="w-4 h-4 mr-2" />
                     Course
                   </Button>
                 )}
               </div>

               {/* Email Input for Direct Messages */}
               {chatMode === 'direct' && (
                 <div className="mb-3">
                   <Input
                     value={recipientEmail}
                     onChange={(e) => setRecipientEmail(e.target.value)}
                     placeholder="Enter recipient's email address..."
                     className="w-full"
                   />
                 </div>
               )}

               <ScrollArea className="h-96 mb-3">
                 <div className="space-y-3">
                   {chatMode === 'direct' && !recipientEmail && (
                     <div className="text-center text-sm text-muted-foreground py-4">
                       Enter an email address to start a direct message conversation.
                     </div>
                   )}
                   {chatMode === 'course' && !currentCourseId && messages.length === 0 && (
                     <div className="text-center text-sm text-muted-foreground py-4">
                       Navigate to a course to start chatting with classmates and instructors.
                     </div>
                   )}
                   {chatMode === 'direct' && !recipientEmail && dummyMessages.map((message) => (
                     <div
                       key={message._id}
                       className={`flex ${message.fromUserId._id === user._id ? 'justify-end' : 'justify-start'}`}
                     >
                       <div className={`flex items-start gap-2 max-w-[80%] ${message.fromUserId._id === user._id ? 'flex-row-reverse' : ''}`}>
                         <Avatar className="w-6 h-6">
                           <AvatarImage src={message.fromUserId.profile?.avatar} />
                           <AvatarFallback className="text-xs">
                             {message.fromUserId.name.charAt(0).toUpperCase()}
                           </AvatarFallback>
                         </Avatar>
                         <div className={`rounded-lg px-3 py-2 text-sm ${
                           message.fromUserId._id === user._id
                             ? 'bg-primary text-primary-foreground'
                             : 'bg-muted'
                         }`}>
                           <div className="font-medium text-xs mb-1">
                             {message.fromUserId.name}
                           </div>
                           <div>{message.message}</div>
                           <div className="text-xs opacity-70 mt-1">
                             {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                   {chatMode === 'course' && messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex ${message.fromUserId._id === user._id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start gap-2 max-w-[80%] ${message.fromUserId._id === user._id ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={message.fromUserId.profile?.avatar} />
                          <AvatarFallback className="text-xs">
                            {message.fromUserId.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`rounded-lg px-3 py-2 text-sm ${
                          message.fromUserId._id === user._id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          <div className="font-medium text-xs mb-1">
                            {message.fromUserId.name}
                          </div>
                          <div>{message.message}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {typingUsers.length > 0 && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                        <div className="text-xs opacity-70">
                          {typingUsers.length === 1 ? 'Someone is typing...' : `${typingUsers.length} people are typing...`}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
                             <div className="flex gap-2">
                 <Input
                   ref={inputRef}
                   value={newMessage}
                   onChange={(e) => setNewMessage(e.target.value)}
                   onKeyPress={handleKeyPress}
                   placeholder={
                     chatMode === 'direct' 
                       ? (recipientEmail ? "Type your message..." : "Enter email first...")
                       : (currentCourseId ? "Type a message..." : "Select a course to chat")
                   }
                   className="flex-1"
                   disabled={chatMode === 'direct' && !recipientEmail}
                 />
                 <Button
                   onClick={handleSendMessage}
                   size="sm"
                   disabled={!newMessage.trim() || (chatMode === 'direct' && !recipientEmail)}
                 >
                   <Send className="w-4 h-4" />
                 </Button>
               </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};

export default ChatFloater;
