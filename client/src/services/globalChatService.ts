const API_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`
  };
};

export interface ChatUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  profile?: {
    avatar?: string;
  };
  courseId: string;
  courseTitle: string;
  isInstructor?: boolean;
}

export interface GlobalMessage {
  _id: string;
  fromUserId: {
    _id: string;
    name: string;
    profile?: {
      avatar?: string;
    };
  };
  toUserId?: {
    _id: string;
    name: string;
    profile?: {
      avatar?: string;
    };
  };
  courseId?: {
    _id: string;
    title: string;
  };
  message: string;
  type: 'text' | 'image' | 'file';
  createdAt: string;
}

class GlobalChatService {
  async getChatUsers(): Promise<{ users: ChatUser[]; courses: any[] }> {
    const response = await fetch(`${API_URL}/chat/users`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch chat users');
    }

    const data = await response.json();
    return data.data;
  }

  async getGlobalMessages(page: number = 1, limit: number = 50): Promise<{
    messages: GlobalMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await fetch(
      `${API_URL}/chat/global/messages?page=${page}&limit=${limit}`,
      {
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch global messages');
    }

    const data = await response.json();
    return data.data;
  }

  async sendGlobalMessage(message: string, courseId?: string, toUserId?: string): Promise<GlobalMessage> {
    const response = await fetch(`${API_URL}/chat/global/messages`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        type: 'text',
        courseId,
        toUserId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const data = await response.json();
    return data.data.message;
  }

  async sendDirectMessageByEmail(message: string, recipientEmail: string): Promise<GlobalMessage> {
    const response = await fetch(`${API_URL}/chat/direct/email`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        type: 'text',
        recipientEmail,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send direct message');
    }

    const data = await response.json();
    return data.data.message;
  }

  async getDirectMessagesWithUser(userId: string, page: number = 1, limit: number = 50): Promise<{
    messages: GlobalMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await fetch(
      `${API_URL}/chat/direct/user/${userId}?page=${page}&limit=${limit}`,
      {
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch direct messages');
    }

    const data = await response.json();
    return data.data;
  }
}

export default new GlobalChatService();
