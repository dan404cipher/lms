# 📧 Production Email Setup Guide

This guide will walk you through setting up a production-ready email system for your LMS platform.

## 🎯 Quick Start

1. **Choose your email provider** (Gmail, SendGrid, AWS SES)
2. **Configure environment variables**
3. **Test your setup**
4. **Deploy to production**

---

## 📮 Option 1: Gmail Setup (Recommended for beginners)

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Navigate to **Security**
3. Enable **2-Step Verification**

### Step 2: Generate App Password
1. Go to [Google Account Settings](https://myaccount.google.com/) → **Security**
2. Under "2-Step Verification", click **"App passwords"**
3. Select **"Mail"** and **"Other (Custom name)"**
4. Name it **"LMS Platform"**
5. Copy the generated **16-character password**

### Step 3: Update Environment Variables
```bash
# In your .env file
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM_NAME=LMS Platform
```

### Step 4: Test Configuration
```bash
npm run test:email your-email@example.com
```

---

## 🚀 Option 2: SendGrid Setup (Recommended for production)

### Step 1: Create SendGrid Account
1. Go to [SendGrid](https://sendgrid.com/)
2. Create a free account (100 emails/day free)
3. Verify your domain or sender identity

### Step 2: Generate API Key
1. Go to **Settings** → **API Keys**
2. Create a new API Key with **"Mail Send"** permissions
3. Copy the API key

### Step 3: Update Environment Variables
```bash
# In your .env file
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM_NAME=LMS Platform
```

### Step 4: Test Configuration
```bash
npm run test:email your-email@example.com
```

---

## ☁️ Option 3: AWS SES Setup (For high volume)

### Step 1: Set up AWS SES
1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Verify your email address or domain
3. Request production access if needed

### Step 2: Create SMTP Credentials
1. Go to **SMTP Settings**
2. Create SMTP credentials
3. Note the SMTP endpoint and credentials

### Step 3: Update Environment Variables
```bash
# In your .env file
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM_NAME=LMS Platform
```

### Step 4: Test Configuration
```bash
npm run test:email your-email@example.com
```

---

## 🧪 Testing Your Email Setup

### Method 1: Using the Test Script
```bash
# Test with your email
npm run test:email your-email@example.com

# Test with different templates
npm run test:email your-email@example.com -- --template=welcome
npm run test:email your-email@example.com -- --template=courseEnrollment
```

### Method 2: Test via API
```bash
# Test forgot password email
curl -X POST http://localhost:5001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

### Method 3: Check Server Logs
Look for these log messages:
- ✅ `Email sent successfully to user@example.com`
- ❌ `Failed to send email to user@example.com`

---

## 🔧 Troubleshooting

### Common Gmail Issues

#### "Invalid login" Error
**Problem**: Authentication failed
**Solution**:
1. Make sure 2-Factor Authentication is enabled
2. Use App Password (not your regular password)
3. Check that the App Password is 16 characters long

#### "Less secure app access" Error
**Problem**: Gmail blocking the connection
**Solution**: Use App Passwords instead of regular passwords

### Common SendGrid Issues

#### "Authentication failed" Error
**Problem**: Invalid API key
**Solution**:
1. Check your API key is correct
2. Ensure the API key has "Mail Send" permissions
3. Verify your sender identity

### Common AWS SES Issues

#### "Email address not verified" Error
**Problem**: Sender email not verified
**Solution**:
1. Verify your sender email in AWS SES
2. Request production access if in sandbox mode

---

## 📊 Email Templates Available

Your LMS platform includes these email templates:

1. **welcome** - New user registration
2. **passwordReset** - Password reset requests
3. **courseEnrollment** - Course enrollment confirmation
4. **courseCompletion** - Course completion certificates
5. **sessionReminder** - Live session reminders

### Customizing Templates
Edit templates in `src/utils/email.ts`:
```typescript
const emailTemplates = {
  welcome: (data: any) => ({
    subject: 'Welcome to LMS Platform',
    html: `... your custom HTML ...`
  }),
  // ... other templates
};
```

---

## 🚀 Production Deployment Checklist

- [ ] Email provider configured
- [ ] Environment variables set
- [ ] Email templates tested
- [ ] Error handling verified
- [ ] Rate limiting configured
- [ ] Monitoring set up
- [ ] Backup email provider (optional)

---

## 📈 Monitoring & Analytics

### Email Metrics to Track
- Delivery rate
- Open rate
- Click rate
- Bounce rate
- Spam complaints

### Logging
All email activities are logged with:
- ✅ Success messages
- ❌ Error details
- 📧 Recipient information
- ⏰ Timestamps

---

## 🔒 Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate API keys** regularly
4. **Monitor for suspicious activity**
5. **Use HTTPS** for all email links
6. **Implement rate limiting** to prevent abuse

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Test with the email test script
4. Verify your email provider's documentation

---

## 🎉 Success!

Once your email setup is working, your LMS platform will be able to:
- Send password reset emails
- Welcome new users
- Send course enrollment confirmations
- Remind users about live sessions
- Send completion certificates

Your users will have a professional, reliable email experience! 🚀
