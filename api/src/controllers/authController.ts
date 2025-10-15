import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

import { User } from '../models/User';
import { sendEmail } from '../utils/email';
import { AppError } from '../middleware/errorHandler';
import ActivityLogger from '../utils/activityLogger';

interface AuthRequest extends Request {
  user?: any;
}

// Generate JWT Token
const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return (jwt.sign as any)({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// Generate Refresh Token
const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return (jwt.sign as any)({ userId }, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
      return;
    }

    const { name, email, password, role = 'learner' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
      return;
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role
    });

    // Generate tokens
    const token = generateToken((user as any)._id.toString());
    const refreshToken = generateRefreshToken((user as any)._id.toString());

    // Send welcome email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to LMS Platform',
        template: 'welcome',
        data: {
          name: user.name,
          verificationUrl: `${process.env.FRONTEND_URL}/verify-email/${token}`
        }
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          _id: user._id, // Include both for compatibility
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('🔍 Login attempt:', { email: req.body.email, passwordLength: req.body.password?.length });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
      return;
    }

    const { email, password } = req.body;
    console.log('📧 Looking for user with email:', email);

    // Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('❌ User not found for email:', email);
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    console.log('✅ User found:', { id: user._id, name: user.name, role: user.role, status: user.status });
    console.log('🔐 Testing password...');

    const isPasswordCorrect = await user.comparePassword(password);
    console.log('🔐 Password test result:', isPasswordCorrect);
    
    if (!isPasswordCorrect) {
      console.log('❌ Password incorrect');
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    // Check if user is active
    if (user.status !== 'active') {
      res.status(401).json({
        success: false,
        message: 'Account is not active. Please contact support.'
      });
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log login activity
    await ActivityLogger.logLogin((user as any)._id.toString(), req);

    // Generate tokens
    const token = generateToken((user as any)._id.toString());
    const refreshToken = generateRefreshToken((user as any)._id.toString());

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          _id: user._id, // Include both for compatibility
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          credits: user.credits,
          profile: user.profile
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
      return;
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
      return;
    }

    // Generate new tokens
    const newToken = generateToken((user as any)._id.toString());
    const newRefreshToken = generateRefreshToken((user as any)._id.toString());

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          credits: user.credits,
          profile: user.profile
        },
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      console.log('user',user)

      res.json({
        success: false,
        message: 'No account found with this email'
      });
      return;
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Send email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        template: 'passwordReset',
        data: {
          name: user.name,
          resetUrl
        }
      });

      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      // Reset the token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      // For development, return success but log the error
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Password reset URL would be:', resetUrl);
        res.json({
          success: true,
          message: 'Password reset link generated successfully. Check server logs for the reset URL.',
          debug: {
            resetUrl,
            emailError: emailError instanceof Error ? emailError.message : 'Unknown error'
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send reset email. Please try again.'
        });
      }
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Validate reset token
// @route   GET /api/auth/reset-password/:token
// @access  Public
export const validateResetToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
      return;
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Token is valid'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
      return;
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
      return;
    }

     // Check if the new password is the same as the current password
     const isSamePassword = await user.comparePassword(password);
    
     if (isSamePassword) {
       res.status(400).json({
         success: false,
         message: 'New password  be the same as your current password'
       });
       return;
     }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Log password reset activity
    await ActivityLogger.logPasswordReset((user as any)._id.toString(), req);

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email
// @route   POST /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;

    // Verify token and update user
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
      return;
    }
    const decoded = (jwt.verify as any)(token, secret);
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
      return;
    }

    user.emailVerified = true;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: { 
        user: {
          id: user._id,
          _id: user._id, // Include both for compatibility
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          credits: user.credits,
          profile: user.profile
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, profile, preferences } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Update fields
    if (name) user.name = name;
    if (profile) user.profile = { ...user.profile, ...profile };
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    // Log profile update activity
    await ActivityLogger.logProfileUpdate((user as any)._id.toString(), req);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if current password is correct
    const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordCorrect) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
      return;
    }

    // Check if new password is the same as current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      res.status(400).json({
        success: false,
        message: 'New password cannot be the same as your current password'
      });
      return;
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log password change activity
    await ActivityLogger.logPasswordChange((user as any)._id.toString(), req);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Log logout activity
    await ActivityLogger.logLogout((req.user as any)._id.toString(), req);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};
