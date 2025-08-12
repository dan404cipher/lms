
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { User, Message, MediaFile } from '@/types';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Image, 
  Reply, 
  Edit, 
  Trash2, 
  Check, 
  CheckCheck,
  X,
  MoreVertical
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Sidebar from '@/components/layout/Sidebar';

interface Connection {
  _id: string;
  requester: User;
  recipient: User;
  status: string;
}

interface MessagePreview {
  id: string;
  text: string;
  media?: File[];
  replyTo?: Message;
}

const MessagesPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [messagePreviews, setMessagePreviews] = useState<MessagePreview[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  // Handle URL parameter for auto-selecting a user
  useEffect(() => {
    const userParam = searchParams.get('user');
    if (userParam && connections.length > 0) {
      const targetUser = connections.find(conn => {
        const otherUser = getOtherUser(conn);
        return otherUser._id === userParam;
      });
      
      if (targetUser) {
        const otherUser = getOtherUser(targetUser);
        setSelectedUser(otherUser);
      }
    }
  }, [searchParams, connections]);

  useEffect(() => {
    if (selectedUser) {
      setMessages([]);
      loadChat(selectedUser._id);
      setNewMessage('');
      setSelectedFiles([]);
      setReplyTo(null);
      setMessagePreviews([]);
    }
  }, [selectedUser]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Extract the other user from each connection
  const getOtherUser = (connection: Connection): User => {
    return connection.requester._id === user?._id ? connection.recipient : connection.requester;
  };

  const loadConnections = async () => {
    try {
      const response = await api.getMyConnections();
      setConnections(response.data || []);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChat = async (userId: string) => {
    try {
      const response = await api.getChat(userId);
      setMessages(response.data || []);
      
      // Mark messages as read
      const unreadMessages = response.data?.filter((msg: Message) => 
        msg.receiver._id === user?._id && !msg.read
      ) || [];
      
      // Mark each unread message as read
      for (const message of unreadMessages) {
        try {
          await api.markMessageAsRead(message._id);
        } catch (error) {
          console.error('Failed to mark message as read:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...imageFiles]);
      
      // Create previews
      imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview: MessagePreview = {
            id: Date.now().toString(),
            text: newMessage,
            media: [file],
            replyTo: replyTo || undefined
          };
          setMessagePreviews(prev => [...prev, preview]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setMessagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    messageInputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setEditText(message.text);
    setShowEditDialog(true);
  };

  const saveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;

    try {
      await api.editMessage(editingMessage._id, editText);
      
      // Update the message in the local state
      setMessages(prev => prev.map(msg => 
        msg._id === editingMessage._id 
          ? { ...msg, text: editText, edited: true, editedAt: new Date().toISOString() }
          : msg
      ));
      
      setShowEditDialog(false);
      setEditingMessage(null);
      setEditText('');
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await api.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const canEditMessage = (message: Message) => {
    const messageTime = new Date(message.createdAt).getTime();
    const currentTime = new Date().getTime();
    const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
    return message.sender._id === user?._id && (currentTime - messageTime) <= tenMinutes;
  };

  const getMessageStatus = (message: Message) => {
    if (message.sender._id !== user?._id) return null;
    
    switch (message.status) {
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImagePreview(true);
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedUser) {
      return;
    }

    // Prepare text - only send if not empty
    const messageText = newMessage.trim() || undefined;

    const tempId = `temp-${Date.now()}`;

    try {
      // Create optimistic message
      const optimisticMessage: Message = {
        _id: tempId,
        sender: user!,
        receiver: selectedUser,
        text: messageText || '',
        media: selectedFiles.map(file => ({
          url: URL.createObjectURL(file),
          publicId: '',
          type: 'image' as const,
          originalName: file.name
        })),
        replyTo: replyTo || undefined,
        edited: false,
        status: 'sending',
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      setSelectedFiles([]);
      setReplyTo(null);
      setMessagePreviews([]);

      // Send to server
      const response = await api.sendMessage(selectedUser._id, messageText, selectedFiles, replyTo?._id);
      
      // Update the optimistic message with the real message data
      setMessages(prev => prev.map(msg => 
        msg._id === tempId 
          ? { ...response.data, _id: response.data._id } // Use the real message data
          : msg
      ));
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
    }
  };

  const filteredConnections = connections
    .filter(connection => connection.status === 'accepted') // Only show accepted connections
    .filter(connection => {
      const otherUser = getOtherUser(connection);
      return otherUser.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

  if (isLoading) {      
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden pt-16">
      <div className="flex h-full w-full">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex ml-64">
          {/* Connections List */}
          <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold mb-3">Connections</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search connections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                {filteredConnections.map((connection) => {
                  const otherUser = getOtherUser(connection);
                  return (
                    <div
                      key={connection._id}
                      onClick={() => {
                        setSelectedUser(otherUser);
                        setMessages([]);
                        setNewMessage('');
                        setSelectedFiles([]);
                        setReplyTo(null);
                        setMessagePreviews([]);
                      }}
                      className={`p-3 cursor-pointer hover:bg-gray-50 rounded-lg mb-2 ${
                        selectedUser?._id === otherUser._id ? 'bg-blue-50 border border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={api.getUploadUrl(otherUser.profilePic || '')} alt={otherUser.name} />
                          <AvatarFallback className="text-lg font-bold">
                            {otherUser.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{otherUser.name}</p>
                          <p className="text-xs text-gray-500 truncate">{otherUser.role}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-gray-50">
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="bg-white border-b border-gray-200 p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={api.getUploadUrl(selectedUser.profilePic || '')} alt={selectedUser.name} />
                      <AvatarFallback className="text-lg font-bold">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{selectedUser.name}</h3>
                      <p className="text-sm text-gray-500">{selectedUser.role}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex ${message.sender._id === user?._id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="max-w-xs">
                          {/* Reply indicator */}
                          {message.replyTo && (
                            <div className={`text-xs text-gray-500 mb-1 ${
                              message.sender._id === user?._id ? 'text-right' : 'text-left'
                            }`}>
                              Replying to: {message.replyTo.text ? message.replyTo.text.substring(0, 30) + '...' : '[Media]'}
                            </div>
                          )}
                          
                          <div
                            className={`px-4 py-2 rounded-lg ${
                              message.sender._id === user?._id
                                ? 'text-white'
                                : 'bg-white border border-gray-200'
                            }`}
                            style={message.sender._id === user?._id ? { backgroundColor: '#235aa5' } : {}}
                          >
                            {/* Media */}
                            {message.media && message.media.length > 0 && (
                              <div className="mb-2 space-y-2">
                                {message.media.map((media, index) => (
                                  <div key={index} className="relative">
                                    <img
                                      src={api.getUploadUrl(media.url)}
                                      alt={`Media ${index + 1}`}
                                      className="max-w-full h-auto rounded cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => handleImageClick(api.getUploadUrl(media.url))}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {message.text && <p>{message.text}</p>}
                            
                            {/* Message metadata */}
                            <div className={`flex items-center justify-between mt-1 text-xs opacity-70 ${
                              message.sender._id === user?._id ? 'flex-row-reverse' : 'flex-row'
                            }`}>
                              <div className="flex items-center gap-1">
                                <span>{formatTime(message.createdAt)}</span>
                                {message.edited && <span>(edited)</span>}
                              </div>
                              
                              {/* Message actions */}
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReply(message)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Reply className="h-3 w-3" />
                                </Button>
                                
                                {message.sender._id === user?._id && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      {canEditMessage(message) && (
                                        <DropdownMenuItem onClick={() => handleEdit(message)}>
                                          <Edit className="h-3 w-3 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => deleteMessage(message._id)}>
                                        <Trash2 className="h-3 w-3 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Read status */}
                          {message.sender._id === user?._id && message.status === 'read' && (
                            <div className="text-xs text-gray-500 mt-1 text-right">
                              read
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Reply indicator */}
                {replyTo && (
                  <div className="bg-gray-100 p-3 mx-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">Replying to:</span> {replyTo.text ? replyTo.text.substring(0, 50) + '...' : '[Media]'}
                      </div>
                      <Button variant="ghost" size="sm" onClick={cancelReply}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* File previews */}
                {selectedFiles.length > 0 && (
                  <div className="bg-gray-100 p-3 mx-4 rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => handleImageClick(URL.createObjectURL(file))}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-red-500 text-white rounded-full"
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Message Input */}
                <div className="bg-white border-t border-gray-200 p-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-shrink-0"
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                    <Input
                      ref={messageInputRef}
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={(!newMessage.trim() && selectedFiles.length === 0)} 
                      style={{ backgroundColor: '#235aa5', borderColor: '#235aa5' }}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Select a connection to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Message Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Edit your message..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveEdit}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Preview"
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessagesPage;
