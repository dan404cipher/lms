export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  profilePic?: string;
  profile?: {
    avatar?: string;
  };
}

export interface Message {
  _id: string;
  sender: User;
  receiver: User;
  text?: string;
  media?: Array<{
    url: string;
    publicId: string;
    type: 'image' | 'video';
    format?: string;
    size?: number;
    originalName?: string;
  }>;
  replyTo?: Message;
  createdAt: string;
  updatedAt: string;
  isRead?: boolean;
  edited?: boolean;
  editedAt?: string;
}

export interface Connection {
  _id: string;
  requester: User;
  recipient: User;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}
