import { sendEmail } from './email';

interface TestEmailOptions {
  to: string;
  template?: string;
  customData?: Record<string, any>;
}

export const testEmailConfiguration = async (options: TestEmailOptions) => {
  console.log('🧪 Testing email configuration...');
  console.log('📧 SMTP Host:', process.env.SMTP_HOST);
  console.log('📧 SMTP Port:', process.env.SMTP_PORT);
  console.log('📧 SMTP User:', process.env.SMTP_USER);
  console.log('📧 SMTP Pass:', process.env.SMTP_PASS ? '***' : 'NOT SET');
  console.log('📧 From Name:', process.env.SMTP_FROM_NAME);

  try {
    const testData = {
      name: 'Test User',
      resetUrl: 'http://localhost:8080/reset-password/test-token',
      courseTitle: 'Test Course',
      studentName: 'Test Student',
      instructorName: 'Test Instructor',
      creditsUsed: 10,
      enrollmentDate: new Date().toLocaleDateString(),
      courseUrl: 'http://localhost:8080/courses/test-course',
      certificateUrl: 'http://localhost:8080/certificates/test-cert',
      sessionTitle: 'Test Session',
      sessionTime: new Date().toLocaleString(),
      duration: 60,
      joinUrl: 'http://localhost:8080/sessions/test-session',
      verificationUrl: 'http://localhost:8080/verify-email/test-token',
      ...options.customData
    };

    const template = options.template || 'passwordReset';
    
    await sendEmail({
      to: options.to,
      subject: '🧪 Email Configuration Test',
      template,
      data: testData
    });

    console.log('✅ Email configuration test successful!');
    console.log('📧 Test email sent to:', options.to);
    console.log('📧 Template used:', template);
    
    return { success: true, message: 'Email test successful' };
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
    
    if (error instanceof Error) {
      const errorMessage = error.message;
      
      if (errorMessage.includes('Invalid login')) {
        console.error('🔑 Authentication failed. Check your SMTP credentials.');
        console.error('💡 For Gmail, make sure you:');
        console.error('   1. Enabled 2-Factor Authentication');
        console.error('   2. Generated an App Password');
        console.error('   3. Used the App Password (not your regular password)');
      } else if (errorMessage.includes('ENOTFOUND')) {
        console.error('🌐 SMTP host not found. Check your SMTP_HOST setting.');
      } else if (errorMessage.includes('ECONNREFUSED')) {
        console.error('🚫 Connection refused. Check your SMTP_PORT setting.');
      } else if (errorMessage.includes('timeout')) {
        console.error('⏰ Connection timeout. Check your network or SMTP settings.');
      }
    }
    
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// CLI test function
export const runEmailTest = async () => {
  const testEmail = process.argv[2];
  
  if (!testEmail) {
    console.error('❌ Please provide a test email address');
    console.log('Usage: npm run test:email your-email@example.com');
    process.exit(1);
  }

  const result = await testEmailConfiguration({ to: testEmail });
  
  if (result.success) {
    console.log('🎉 Email test completed successfully!');
    process.exit(0);
  } else {
    console.error('💥 Email test failed!');
    process.exit(1);
  }
};

// Export for use in other files
export default testEmailConfiguration;

// Run CLI test if this file is executed directly
if (require.main === module) {
  runEmailTest();
}
