import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X, Send, Plus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { User, Message } from "@/types";

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Connection {
  _id: string;
  requester: User;
  recipient: User;
  status: string;
}

const MessagesModal = ({ isOpen, onClose }: MessagesModalProps) => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadConnections();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedUser) {
      setMessages([]);
      loadChat(selectedUser._id);
      setMessageInput("");

      // Mark messages as read when user is selected
      api.markMessagesAsRead(selectedUser._id).catch((error) => {
        console.error("Failed to mark messages as read:", error);
      });
    }
  }, [selectedUser]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Extract the other user from each connection
  const getOtherUser = (connection: Connection): User => {
    return connection.requester._id === user?._id
      ? connection.recipient
      : connection.requester;
  };

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const response = await api.getMyConnections();
      setConnections(response.data || []);
    } catch (error) {
      console.error("Failed to load connections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChat = async (userId: string) => {
    try {
      const response = await api.getChat(userId);
      setMessages(response.data || []);
    } catch (error) {
      console.error("Failed to load chat:", error);
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedUser) return;

    sendMessage();
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedUser) return;

    try {
      await api.sendMessage(selectedUser._id, messageInput);
      setMessageInput("");
      loadChat(selectedUser._id);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConnections = connections
    .filter((connection) => connection.status === "accepted")
    .map(getOtherUser)
    .filter((connectionUser) =>
      connectionUser.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (!isOpen) return null;

  return (
    <div
      className="flex h-screen w-96 flex-col bg-background border-l border-t fixed top-16 right-0"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={api.getUploadUrl(user?.profilePic || "")} />
            <AvatarFallback className="text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">Messages</h2>
            <p className="text-xs text-muted-foreground">
              Active conversations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
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
                <AvatarImage
                  src={api.getUploadUrl(selectedUser.profilePic || "")}
                  alt={selectedUser.name}
                />
                <AvatarFallback className="text-white font-bold">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{selectedUser.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedUser.role}
                </p>
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
                className={`flex ${
                  message.sender._id === user?._id
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    message.sender._id === user?._id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  <p>{message.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender._id === user?._id
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t bg-white p-4">
            <div className="flex items-center gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 h-9"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                size="icon"
                className="h-9 w-9"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
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
                        <AvatarImage
                          src={api.getUploadUrl(
                            connectionUser.profilePic || ""
                          )}
                          alt={connectionUser.name}
                        />
                        <AvatarFallback className="text-white font-bold">
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
  );
};

export default MessagesModal;
