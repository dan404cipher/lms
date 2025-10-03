import { Response } from 'express';
import Connection from '../models/Connection';
import { AuthenticatedRequest } from '../types';

// @desc    Get user's connections
// @route   GET /api/connections
// @access  Private
export const getMyConnections = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const connections = await Connection.find({
      $or: [
        { requester: req.user!._id },
        { recipient: req.user!._id }
      ]
    })
    .populate('requester', 'name email profilePic')
    .populate('recipient', 'name email profilePic')
    .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: connections
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message
    });
  }
};

// @desc    Send connection request
// @route   POST /api/connections
// @access  Private
export const sendConnectionRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      res.status(400).json({
        success: false,
        message: 'Recipient ID is required'
      });
      return;
    }

    if (recipientId === req.user!._id.toString()) {
      res.status(400).json({
        success: false,
        message: 'You cannot send a connection request to yourself'
      });
      return;
    }

    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      $or: [
        { requester: req.user!._id, recipient: recipientId },
        { requester: recipientId, recipient: req.user!._id }
      ]
    });

    if (existingConnection) {
      res.status(400).json({
        success: false,
        message: 'Connection already exists'
      });
      return;
    }

    const connection = await Connection.create({
      requester: req.user!._id,
      recipient: recipientId
    });

    await connection.populate('requester', 'name email profilePic');
    await connection.populate('recipient', 'name email profilePic');

    res.status(201).json({
      success: true,
      message: 'Connection request sent successfully',
      data: connection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message
    });
  }
};

// @desc    Accept connection request
// @route   PUT /api/connections/:id/accept
// @access  Private
export const acceptConnection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const connection = await Connection.findOne({
      _id: id,
      recipient: req.user!._id,
      status: 'pending'
    });

    if (!connection) {
      res.status(404).json({
        success: false,
        message: 'Connection request not found'
      });
      return;
    }

    connection.status = 'accepted';
    await connection.save();

    await connection.populate('requester', 'name email profilePic');
    await connection.populate('recipient', 'name email profilePic');

    res.json({
      success: true,
      message: 'Connection accepted successfully',
      data: connection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message
    });
  }
};

// @desc    Reject connection request
// @route   PUT /api/connections/:id/reject
// @access  Private
export const rejectConnection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const connection = await Connection.findOne({
      _id: id,
      recipient: req.user!._id,
      status: 'pending'
    });

    if (!connection) {
      res.status(404).json({
        success: false,
        message: 'Connection request not found'
      });
      return;
    }

    connection.status = 'rejected';
    await connection.save();

    res.json({
      success: true,
      message: 'Connection rejected successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: (error as Error).message
    });
  }
};
