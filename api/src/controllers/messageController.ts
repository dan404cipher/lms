import { Response } from 'express';
import Message from '../models/Message';
import Connection from '../models/Connection';
import { AuthenticatedRequest } from '../types';
import { uploadFile } from '../utils/fileUpload';

// @desc    Send a message
// @route   POST /api/chat/send
// @access  Private
export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { receiverId, text, replyTo } = req.body;
    const files = req.files as Express.Multer.File[];

    // Check if users are connected
    const connection = await Connection.findOne({
      $or: [
        { requester: req.user!._id, recipient: receiverId },
        { requester: receiverId, recipient: req.user!._id }
      ],
      status: 'accepted'
    });

    if (!connection) {
      res.status(403).json({
        success: false,
        message: 'You can only send messages to connected users'
      });
      return;
    }

    // Upload media files if any
    const mediaFiles = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const uploadResult = await uploadFile(file);
          const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
          
          mediaFiles.push({
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            type: fileType,
            format: uploadResult.format,
            size: uploadResult.size,
            originalName: file.originalname
          });
        } catch (error) {
          console.error('File upload failed:', error);
          res.status(400).json({
            success: false,
            message: `Failed to upload file: ${file.originalname}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return;
        }
      }
    }

    const messageData: any = {
      sender: req.user!._id,
      receiver: receiverId,
      media: mediaFiles
    };

    // Only add text if it's not empty
    if (text && text.trim()) {
      messageData.text = text.trim();
    }

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    const message = await Message.create(messageData);

    await message.populate('sender', 'name profilePic');
    await message.populate('receiver', 'name profilePic');
    if (replyTo) {
      await message.populate('replyTo', 'text');
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message
    });
  }
};

// @desc    Get chat with a user
// @route   GET /api/chat/:userId
// @access  Private
export const getChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if users are connected
    const connection = await Connection.findOne({
      $or: [
        { requester: req.user!._id, recipient: userId },
        { requester: userId, recipient: req.user!._id }
      ],
      status: 'accepted'
    });

    if (!connection) {
      res.status(403).json({
        success: false,
        message: 'You can only view chats with connected users'
      });
      return;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const messages = await Message.find({
      $or: [
        { sender: req.user!._id, receiver: userId },
        { sender: userId, receiver: req.user!._id }
      ]
    })
      .populate('sender', 'name profilePic')
      .populate('receiver', 'name profilePic')
      .populate('replyTo', 'text')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Message.countDocuments({
      $or: [
        { sender: req.user!._id, receiver: userId },
        { sender: userId, receiver: req.user!._id }
      ]
    });

    res.json({
      success: true,
      data: messages.reverse(), // Reverse to get chronological order
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message
    });
  }
};

// @desc    Get unread message count
// @route   GET /api/chat/unread-count
// @access  Private
export const getUnreadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user!._id,
      read: false
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message
    });
  }
};

// @desc    Edit a message
// @route   PATCH /api/chat/messages/:messageId
// @access  Private
export const editMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found'
      });
      return;
    }

    // Check if user owns the message
    if (message.sender.toString() !== req.user!._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
      return;
    }

    // Check if message is within 10 minutes
    const messageTime = new Date(message.createdAt).getTime();
    const currentTime = new Date().getTime();
    const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds

    if (currentTime - messageTime > tenMinutes) {
      res.status(400).json({
        success: false,
        message: 'Messages can only be edited within 10 minutes of sending'
      });
      return;
    }

    message.text = text;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate('sender', 'name profilePic');
    await message.populate('receiver', 'name profilePic');

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message
    });
  }
};

// @desc    Delete a message
// @route   DELETE /api/chat/messages/:messageId
// @access  Private
export const deleteMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found'
      });
      return;
    }

    // Check if user owns the message
    if (message.sender.toString() !== req.user!._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
      return;
    }

    await Message.findByIdAndDelete(messageId);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message
    });
  }
};

// @desc    Mark message as read
// @route   PATCH /api/chat/messages/:messageId/read
// @access  Private
export const markMessageAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found'
      });
      return;
    }

    // Check if user is the receiver
    if (message.receiver.toString() !== req.user!._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You can only mark messages sent to you as read'
      });
      return;
    }

    message.isRead = true;
    await message.save();

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message
    });
  }
};

// @desc    Mark all messages with a user as read
// @route   PUT /api/chat/:userId/read
// @access  Private
export const markMessagesAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    await Message.updateMany(
      {
        sender: userId,
        receiver: req.user!._id,
        isRead: false
      },
      {
        isRead: true
      }
    );

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message
    });
  }
};

// @desc    Get unread message count
// @route   GET /api/chat/unread-count
// @access  Private
export const getUnreadMessageCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user!._id,
      isRead: false
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message
    });
  }
}; 