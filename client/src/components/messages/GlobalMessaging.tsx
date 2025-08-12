import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { X, Send, Search, MessageCircle, Image, Reply, Edit, Trash2, Paperclip } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { User, Message } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

interface Connection {
  _id: string;
  requester: User;
  recipient: User;
  status: string;
}

const GlobalMessaging = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // New state for enhanced messaging features
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [messagePreviews, setMessagePreviews] = useState<{ [key: string]: string }>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      console.log('GlobalMessaging - Modal opened, loading connections...');
      loadConnections();
    }
  }, [isOpen]);

  useEffect(() => {
    // Load connections when component mounts to show avatars in floater
    console.log('GlobalMessaging - Component mounted, user:', user?._id, user?.name);
    loadConnections();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      setMessages([]);
      loadChat(selectedUser._id);
      setMessageInput('');
      setSelectedFiles([]);
      setReplyTo(null);
    }
  }, [selectedUser]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Extract the other user from each connection
  const getOtherUser = (connection: Connection): User => {
    const otherUser = connection.requester._id === user?._id ? connection.recipient : connection.requester;
    console.log('getOtherUser - connection:', connection._id, 'user:', user?._id, 'otherUser:', otherUser.name);
    return otherUser;
  };

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      console.log('GlobalMessaging - Starting to load connections...');
      console.log('GlobalMessaging - Current user:', user?._id, user?.name);
      
      const [connectionsResponse, unreadResponse] = await Promise.all([
        api.getMyConnections(),
        api.getUnreadMessageCount()
      ]);
      
      console.log('GlobalMessaging - API response:', connectionsResponse);
      console.log('GlobalMessaging - All connections:', connectionsResponse.data?.length || 0);
      console.log('GlobalMessaging - Accepted connections:', connectionsResponse.data?.filter(c => c.status === 'accepted').length || 0);
      console.log('GlobalMessaging - Pending connections:', connectionsResponse.data?.filter(c => c.status === 'pending').length || 0);
      
      setConnections(connectionsResponse.data || []);
      setUnreadCount(unreadResponse.data?.count || 0);
    } catch (error) {
      console.error('GlobalMessaging - Failed to load connections:', error);
      console.error('GlobalMessaging - Error details:', error.response?.data || error.message);
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
        msg.sender._id !== user?._id && !msg.readAt
      ) || [];
      
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
    
    if (imageFiles.length + selectedFiles.length > 5) {
      alert('You can only upload up to 5 images at once');
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...imageFiles]);
    
    // Create previews for new files
    imageFiles.forEach(file => {
      const preview = URL.createObjectURL(file);
      setMessagePreviews(prev => ({ ...prev, [file.name]: preview }));
    });
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(file => file.name !== fileName));
    setMessagePreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[fileName];
      return newPreviews;
    });
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
    setEditText(message.text || '');
    setShowEditDialog(true);
  };

  const saveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;
    
    try {
      await api.editMessage(editingMessage._id, editText);
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
    if (message.sender._id !== user?._id) return false;
    const messageTime = new Date(message.createdAt).getTime();
    const currentTime = new Date().getTime();
    const tenMinutes = 10 * 60 * 1000;
    return currentTime - messageTime < tenMinutes;
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImagePreview(true);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSendMessage = () => {
    if ((!messageInput.trim() && selectedFiles.length === 0) || !selectedUser) return;
    sendMessage();
  };

  const sendMessage = async () => {
    if ((!messageInput.trim() && selectedFiles.length === 0) || !selectedUser) return;

    const messageData = {
      text: messageInput.trim() || undefined,
      media: selectedFiles,
      replyTo: replyTo?._id
    };

    // Create optimistic message
    const optimisticMessage: Message = {
      _id: `temp-${Date.now()}`,
      text: messageData.text,
      media: selectedFiles.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type,
        name: file.name
      })),
      replyTo: replyTo || undefined,
      sender: user!,
      recipient: selectedUser,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'sending',
      edited: false
    };

    // Add optimistic message
    setMessages(prev => [...prev, optimisticMessage]);
    setMessageInput('');
    setSelectedFiles([]);
    setReplyTo(null);
    setMessagePreviews({});

    try {
      const response = await api.sendMessage(selectedUser._id, messageData.text, messageData.media, messageData.replyTo);
      
      // Update optimistic message with real data
      setMessages(prev => prev.map(msg => 
        msg._id === optimisticMessage._id 
          ? { ...response.data, status: 'sent' }
          : msg
      ));
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConnections = connections
    .filter(connection => connection.status === 'accepted')
    .map(getOtherUser)
    .filter(connectionUser =>
      connectionUser.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  console.log('GlobalMessaging - Total connections:', connections.length);
  console.log('GlobalMessaging - Accepted connections:', connections.filter(c => c.status === 'accepted').length);
  console.log('GlobalMessaging - Filtered connections:', filteredConnections.length);

  return (
    <>
      {/* Debug */}
      {console.log('GlobalMessaging render - isOpen:', isOpen)}
      
      {/* Messages Floater */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[9999] bg-white hover:bg-gray-50 text-black border shadow-2xl rounded-full px-4 py-3 transition-all duration-200 flex items-center gap-3 border-2 border-white"
        >
          <div className="relative">
            <MessageCircle className="h-5 w-5 text-gray-600" />
            {unreadCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </div>
          <span className="font-medium">Messages</span>
          <div className="flex -space-x-2">
            {filteredConnections.slice(0, 3).map((connectionUser, index) => (
              <Avatar
                key={connectionUser._id}
                className="w-8 h-8 border-2 border-white"
                style={{ zIndex: 3 - index }}
              >
                <AvatarImage src={api.getUploadUrl(connectionUser.profilePic || '')} alt={connectionUser.name} />
                <AvatarFallback className="text-black font-bold text-xs">
                  {connectionUser.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </button>
      )}

      {/* Messages Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div 
            className="flex flex-col bg-background border-l border-t shadow-2xl pointer-events-auto rounded-2xl absolute" 
            style={{ 
              width: '400px', 
              height: '600px', 
              bottom: '20px', 
              right: '40px' 
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={api.getUploadUrl(user?.profilePic || '')} />
                  <AvatarFallback className="text-sm font-bold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-semibold">Messages</h2>
                  <p className="text-xs text-muted-foreground">Active conversations</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b bg-white">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={api.getUploadUrl(selectedUser.profilePic || '')} alt={selectedUser.name} />
                      <AvatarFallback className="text-black font-bold">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{selectedUser.name}</h3>
                      <p className="text-xs text-muted-foreground">{selectedUser.role}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedUser(null)}
                    className="text-xs"
                  >
                    Back
                  </Button>
                </div>

                {/* Messages Display */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex ${message.sender._id === user?._id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-xs">
                        {/* Reply indicator */}
                        {message.replyTo && (
                          <div className={`text-xs mb-1 ${message.sender._id === user?._id ? 'text-right' : 'text-left'}`}>
                            <div className={`inline-block px-2 py-1 rounded ${message.sender._id === user?._id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                              Replying to: {message.replyTo.text?.substring(0, 30)}...
                            </div>
                          </div>
                        )}
                        
                        <div className="relative group">
                          <div
                            className={`px-3 py-2 rounded-lg text-sm ${
                              message.sender._id === user?._id
                                ? 'text-white'
                                : 'bg-gray-200 text-gray-900'
                            }`}
                            style={message.sender._id === user?._id ? { backgroundColor: '#235aa5' } : {}}
                          >
                            {/* Media */}
                            {message.media && message.media.length > 0 && (
                              <div className="space-y-2 mb-2">
                                {message.media.map((media, index) => (
                                  <div key={index} className="relative">
                                    <img
                                      src={api.getUploadUrl(media.url)}
                                      alt={media.name}
                                      className="max-w-full h-auto rounded cursor-pointer"
                                      onClick={() => handleImageClick(media.url)}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Text */}
                            {message.text && <p>{message.text}</p>}
                            
                            {/* Message info */}
                            <div className={`flex items-center justify-between mt-1 text-xs ${message.sender._id === user?._id ? 'text-blue-100' : 'text-gray-500'}`}>
                              <span>
                                {formatTime(message.createdAt)}
                                {message.edited && ' (edited)'}
                              </span>
                            </div>
                          </div>
                          {/* Read status */}
                          {message.sender._id === user?._id && message.status === 'read' && (
                            <div className="text-xs text-gray-500 mt-1 text-right">
                              read
                            </div>
                          )}
                          
                          {/* Message actions */}
                          <div className={`absolute top-1 ${message.sender._id === user?._id ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleReply(message)}>
                                  <Reply className="h-4 w-4 mr-2" />
                                  Reply
                                </DropdownMenuItem>
                                {canEditMessage(message) && (
                                  <DropdownMenuItem onClick={() => handleEdit(message)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {message.sender._id === user?._id && (
                                  <DropdownMenuItem onClick={() => deleteMessage(message._id)}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply indicator */}
                {replyTo && (
                  <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-blue-800">
                        Replying to: {replyTo.text?.substring(0, 30)}...
                      </div>
                      <Button variant="ghost" size="sm" onClick={cancelReply} className="h-6 px-2 text-xs">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* File previews */}
                {selectedFiles.length > 0 && (
                  <div className="px-4 py-2 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      {selectedFiles.map((file) => (
                        <div key={file.name} className="relative">
                          <img
                            src={messagePreviews[file.name]}
                            alt={file.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <button
                            onClick={() => removeFile(file.name)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <div className="border-t bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 w-9"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      ref={messageInputRef}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 h-9"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() && selectedFiles.length === 0}
                      size="icon"
                      className="h-9 w-9"
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
              <>
                {/* Search Input */}
                <div className="p-4 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search connections..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Loading conversations...
                    </div>
                  ) : filteredConnections.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No connections found
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredConnections.map((connectionUser) => (
                        <div
                          key={connectionUser._id}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedUser(connectionUser)}
                        >
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={api.getUploadUrl(connectionUser.profilePic || '')} alt={connectionUser.name} />
                              <AvatarFallback className="text-black font-bold">
                                {connectionUser.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-sm truncate">
                                {connectionUser.name}
                              </h3>
                            </div>
                            <p className="text-xs text-gray-600 truncate">
                              {connectionUser.role}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

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

      {/* Image Preview Dialog */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <img
              src={api.getUploadUrl(selectedImage)}
              alt="Preview"
              className="max-w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalMessaging; 