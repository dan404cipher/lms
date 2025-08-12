import nodemailer from 'nodemailer';

interface EmailData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
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
  try {
    const transporter = createTransporter();
    
    // Get template
    const template = emailTemplates[emailData.template as keyof typeof emailTemplates];
    if (!template) {
      throw new Error(`Email template '${emailData.template}' not found`);
    }
    
    const emailContent = template(emailData.data);
    
    // Send email
    await transporter.sendMail({
      from: `"LMS Platform" <${process.env.SMTP_USER}>`,
      to: emailData.to,
      subject: emailContent.subject,
      html: emailContent.html,
    });
    
    console.log(`Email sent successfully to ${emailData.to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
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
