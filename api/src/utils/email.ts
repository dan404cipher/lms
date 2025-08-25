import nodemailer from 'nodemailer';

interface EmailData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

// Create transporter
const createTransporter = () => {
  // Validate required environment variables
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP configuration is incomplete. Please check your environment variables.');
  }

  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Production settings
    pool: true, // Use pooled connection
    maxConnections: 5, // Maximum number of connections to pool
    maxMessages: 100, // Maximum number of messages per connection
    rateLimit: 14, // Maximum number of messages per second
    // Timeout settings
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
  };

  console.log(`Creating SMTP transporter for ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  
  return nodemailer.createTransport(config);
};

// Email templates
const emailTemplates = {
  welcome: (data: any) => ({
    subject: 'Welcome to LMS Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to LMS Platform!</h2>
        <p>Hi ${data.name},</p>
        <p>Thank you for registering with our Learning Management System. We're excited to have you on board!</p>
        <p>To get started, please verify your email address by clicking the link below:</p>
        <a href="${data.verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
          Verify Email Address
        </a>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>The LMS Team</p>
      </div>
    `
  }),
  
  passwordReset: (data: any) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hi ${data.name},</p>
        <p>We received a request to reset your password. Click the link below to create a new password:</p>
        <a href="${data.resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
          Reset Password
        </a>
        <p>This link will expire in 10 minutes for security reasons.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>Best regards,<br>The LMS Team</p>
      </div>
    `
  }),
  
  courseEnrollment: (data: any) => ({
    subject: `Enrolled in ${data.courseTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Course Enrollment Confirmation</h2>
        <p>Hi ${data.studentName},</p>
        <p>You have successfully enrolled in <strong>${data.courseTitle}</strong>.</p>
        <p>Course Details:</p>
        <ul>
          <li>Course: ${data.courseTitle}</li>
          <li>Instructor: ${data.instructorName}</li>
          <li>Credits Used: ${data.creditsUsed}</li>
          <li>Enrollment Date: ${data.enrollmentDate}</li>
        </ul>
        <a href="${data.courseUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
          Start Learning
        </a>
        <p>Happy learning!</p>
        <p>Best regards,<br>The LMS Team</p>
      </div>
    `
  }),
  
  courseCompletion: (data: any) => ({
    subject: `Congratulations! You've completed ${data.courseTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Course Completion Certificate</h2>
        <p>Hi ${data.studentName},</p>
        <p>Congratulations! You have successfully completed <strong>${data.courseTitle}</strong>.</p>
        <p>Your certificate is ready for download:</p>
        <a href="${data.certificateUrl}" style="background-color: #ffc107; color: black; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
          Download Certificate
        </a>
        <p>Keep up the great work!</p>
        <p>Best regards,<br>The LMS Team</p>
      </div>
    `
  }),
  
  sessionReminder: (data: any) => ({
    subject: `Reminder: ${data.sessionTitle} starts in 1 hour`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Live Session Reminder</h2>
        <p>Hi ${data.studentName},</p>
        <p>This is a reminder that your live session <strong>${data.sessionTitle}</strong> starts in 1 hour.</p>
        <p>Session Details:</p>
        <ul>
          <li>Course: ${data.courseTitle}</li>
          <li>Session: ${data.sessionTitle}</li>
          <li>Time: ${data.sessionTime}</li>
          <li>Duration: ${data.duration} minutes</li>
        </ul>
        <a href="${data.joinUrl}" style="background-color: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">
          Join Session
        </a>
        <p>See you there!</p>
        <p>Best regards,<br>The LMS Team</p>
      </div>
    `
  })
};

// Send email function
export const sendEmail = async (emailData: EmailData): Promise<void> => {
  let transporter: any = null;
  
  try {
    // Validate email data
    if (!emailData.to || !emailData.template) {
      throw new Error('Email data is incomplete: missing recipient or template');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to)) {
      throw new Error(`Invalid email format: ${emailData.to}`);
    }

    transporter = createTransporter();
    
    // Get template
    const template = emailTemplates[emailData.template as keyof typeof emailTemplates];
    if (!template) {
      throw new Error(`Email template '${emailData.template}' not found`);
    }
    
    const emailContent = template(emailData.data);
    
    // Prepare email options
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'LMS Platform'}" <${process.env.SMTP_USER}>`,
      to: emailData.to,
      subject: emailContent.subject,
      html: emailContent.html,
      // Add headers for better deliverability
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'normal'
      }
    };
    
    // Send email with timeout
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email send timeout')), 30000)
    );
    
    await Promise.race([sendPromise, timeoutPromise]);
    
    console.log(`✅ Email sent successfully to ${emailData.to}`);
    
  } catch (error) {
    console.error(`❌ Failed to send email to ${emailData.to}:`, error);
    
    // Log specific error details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
        response: (error as any).response
      });
    }
    
    throw error;
  } finally {
    // Close transporter if it exists
    if (transporter) {
      try {
        await transporter.close();
      } catch (closeError) {
        console.warn('Failed to close transporter:', closeError);
      }
    }
  }
};

// Send bulk emails
export const sendBulkEmail = async (emails: EmailData[]): Promise<void> => {
  const transporter = createTransporter();
  
  for (const emailData of emails) {
    try {
      const template = emailTemplates[emailData.template as keyof typeof emailTemplates];
      if (!template) {
        console.error(`Email template '${emailData.template}' not found`);
        continue;
      }
      
      const emailContent = template(emailData.data);
      
      await transporter.sendMail({
        from: `"LMS Platform" <${process.env.SMTP_USER}>`,
        to: emailData.to,
        subject: emailContent.subject,
        html: emailContent.html,
      });
      
      console.log(`Email sent successfully to ${emailData.to}`);
    } catch (error) {
      console.error(`Failed to send email to ${emailData.to}:`, error);
    }
  }
};
