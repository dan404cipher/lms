# Real Zoom Integration Setup Guide

## 🎯 Overview
This guide will help you set up real Zoom integration with cloud recording for your LMS.

## 📋 Prerequisites
- Zoom Pro, Business, Education, or Enterprise account
- Access to Zoom App Marketplace
- Your LMS server accessible via internet (for webhooks)

## 🚀 Step 1: Create Zoom App

### 1.1 Go to Zoom Marketplace
1. Visit [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Sign in with your Zoom account
3. Click **"Develop"** in the top navigation
4. Click **"Build App"**

### 1.2 Choose App Type
1. Select **"Server-to-Server OAuth"** (recommended for 2024)
2. Click **"Create"**

### 1.3 App Information
Fill out the basic app information:
```
App Name: LMS Integration
Short Description: LMS integration for automated meeting management
Long Description: This app allows our Learning Management System to create, manage, and record Zoom meetings automatically for educational sessions.
Developer Contact Name: [Your Name]
Developer Contact Email: [Your Email]
```

### 1.4 App Credentials
After creating the app, you'll see your credentials:
```
Account ID: [Copy this - needed for .env]
Client ID: [Copy this - needed for .env]
Client Secret: [Copy this - needed for .env]
```

## 🔧 Step 2: Configure App Scopes

In your Zoom app settings, add these scopes:

### Required Scopes:
- `meeting:write:admin` - Create and manage meetings
- `meeting:read:admin` - Read meeting information
- `recording:read:admin` - Access meeting recordings
- `user:read:admin` - Read user information
- `webhook_token:read:admin` - For webhook verification

## 🔑 Step 3: Update Environment Variables

Add these to your `.env` file in the `api` directory:

```env
# Zoom Integration Settings
ZOOM_ACCOUNT_ID=your_actual_account_id_here
ZOOM_CLIENT_ID=your_actual_client_id_here
ZOOM_CLIENT_SECRET=your_actual_client_secret_here

# Optional: Webhook Settings
ZOOM_WEBHOOK_SECRET_TOKEN=your_webhook_secret_token
```

## 📹 Step 4: Configure Cloud Recording

### 4.1 Enable Cloud Recording in Zoom Account
1. Sign in to your Zoom account
2. Go to **Account Settings** → **Recording**
3. Enable **Cloud Recording**
4. Configure recording settings:
   - ☑️ Save participant chat in the recording
   - ☑️ Save closed captions as a VTT file
   - ☑️ Add a timestamp to the recording
   - ☑️ Automatic recording (Host can start automatic recording)
   - ☑️ Automatic deletion of cloud recordings
     └─ Delete after: 365 days (or your preference)

### 4.2 Meeting Settings
1. In **Account Settings**, go to **Meeting** tab
2. Configure these settings:
   - ☑️ Allow participants to join before host
   - ☑️ Always show meeting controls
   - ☑️ Enable waiting room (optional)
   - ☑️ Always show meeting control toolbar

## 🔄 Step 5: Set Up Webhooks (Optional)

### 5.1 Configure Webhook Endpoint
In your Zoom app settings, add webhook endpoint:
```
Event notification endpoint URL: https://yourdomain.com/api/sessions/webhook
```

### 5.2 Subscribe to Events
Subscribe to these events:
- `meeting.started`
- `meeting.ended`
- `recording.completed`

## 🧪 Step 6: Test Your Integration

### 6.1 Restart Your Server
```bash
cd api
npm run dev
```

### 6.2 Create a Test Session
1. Go to your LMS
2. Navigate to Sessions
3. Click "Create Session"
4. Fill out the session details
5. Click "Create"

### 6.3 Check Server Logs
You should see:
```
🚀 Creating real Zoom meeting with API...
✅ Zoom meeting created successfully: [meeting_id]
📹 Cloud recording enabled for meeting: [meeting_id]
```

### 6.4 Test Meeting Start
1. Click "Start Session" on your created session
2. You should be redirected to a real Zoom meeting
3. The meeting should start with cloud recording enabled

## 📁 Step 7: Recording Storage

### 7.1 Cloud Recording Storage
- Recordings are stored in Zoom's cloud
- Your database stores metadata (URLs, titles, duration, etc.)
- Users stream recordings directly from Zoom's servers

### 7.2 Local Recording Storage (Optional)
If you want to download recordings to your server, the system will:
1. Download recordings from Zoom cloud
2. Store them in `/api/recordings/` directory
3. Update database with local file paths

## 🔍 Troubleshooting

### Common Issues:

#### 1. "Zoom credentials not configured" Error
- Check that all three environment variables are set
- Restart your server after updating .env
- Verify credentials are correct

#### 2. "Zoom authentication failed" Error
- Check your Client ID and Client Secret
- Ensure your app is published/activated
- Verify the Account ID is correct

#### 3. "Zoom API access denied" Error
- Check that all required scopes are enabled
- Ensure your app has the necessary permissions
- Verify your Zoom account has the required plan

#### 4. "If you are the meeting host, sign in to start the meeting" Error
- This means you're using mock meetings instead of real ones
- Check your .env file has the correct Zoom credentials
- Restart your server

## ✅ Verification Checklist

- [ ] Zoom app created with Server-to-Server OAuth
- [ ] All required scopes enabled
- [ ] Environment variables set correctly
- [ ] Cloud recording enabled in Zoom account
- [ ] Server restarted after configuration
- [ ] Test session created successfully
- [ ] Real Zoom meeting URL generated
- [ ] Meeting starts without errors
- [ ] Cloud recording begins automatically

## 🎉 Success!

Once configured, your LMS will:
- Create real Zoom meetings for each session
- Enable automatic cloud recording
- Store recording metadata in your database
- Allow instructors to start meetings as hosts
- Allow students to join as participants
- Process recordings when meetings end

## 📞 Support

If you encounter issues:
1. Check the server logs for detailed error messages
2. Verify your Zoom app configuration
3. Ensure your Zoom account has the required permissions
4. Check that all environment variables are set correctly
