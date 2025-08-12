import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';
import { User } from '../models/User';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query: any = { userId: req.user._id };

    // Filter by read status
    if (req.query.read !== undefined) {
      if (req.query.read === 'true') {
        query.readAt = { $exists: true };
      } else {
        query.readAt = { $exists: false };
      }
    }

    // Filter by type
    if (req.query.type) {
      query.type = req.query.type;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      readAt: { $exists: false }
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id
      },
      {
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.updateMany(
      {
        userId: req.user._id,
        readAt: { $exists: false }
      },
      {
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification settings
// @route   GET /api/notifications/settings
// @access  Private
export const getNotificationSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user._id).select('preferences');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { settings: user.preferences.notifications }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update notification settings
// @route   PUT /api/notifications/settings
// @access  Private
export const updateNotificationSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, push, inApp } = req.body;

    const updateData: any = {};
    if (email !== undefined) updateData['preferences.notifications.email'] = email;
    if (push !== undefined) updateData['preferences.notifications.push'] = push;
    if (inApp !== undefined) updateData['preferences.notifications.inApp'] = inApp;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('preferences');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: { settings: user.preferences.notifications }
    });
  } catch (error) {
    next(error);
  }
};
