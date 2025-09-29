# Complete Zoom Integration Guide for LMS

## 🎯 Overview

This guide provides step-by-step instructions for setting up Zoom integration with your LMS, including creating a Zoom app, configuring webhooks, and setting up your environment for real meetings with cloud recording.

## 📋 Prerequisites

- Zoom Pro, Business, Education, or Enterprise account
- Access to Zoom App Marketplace
- Your LMS server accessible via internet (for webhooks)
- Admin access to your Zoom account

## 🚀 Part 1: Creating Zoom App in Zoom Portal

### Step 1: Access Zoom App Marketplace

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Sign in with your Zoom account credentials
3. Click **"Develop"** in the top navigation
4. Click **"Build App"**

### Step 2: Choose App Type

1. Select **"Server-to-Server OAuth"** 
   - ✅ Recommended for 2024 (replaces deprecated JWT)
   - ✅ More secure than JWT
   - ✅ No user intervention required
2. Click **"Create"**

### Step 3: App Information

Fill out the basic app information:

```
App Name: [Your LMS Name] Integration
Short Description: LMS integration for automated meeting management
Long Description: This app allows our Learning Management System to create, manage, and record Zoom meetings automatically for educational sessions.
Developer Contact Name: [Your Name]
Developer Contact Email: [Your Email]
```

### Step 4: App Credentials

After creating the app, you'll see your credentials:

```
Account ID: [Copy this - needed for .env]
Client ID: [Copy this - needed for .env]
Client Secret: [Copy this - needed for .env]
```

⚠️ **Important**: Keep these credentials secure and never commit them to version control.

### Step 5: Scopes Configuration

Add the following scopes to your app:

#### Required Scopes:
- `meeting:write:admin` - Create and manage meetings
- `meeting:read:admin` - Read meeting information
- `recording:read:admin` - Access meeting recordings
- `user:read:admin` - Read user information
- `webhook_token:read:admin` - For webhook verification

#### How to Add Scopes:
1. Go to **"Scopes"** tab in your app
2. Click **"+ Add Scopes"**
3. Search and select each scope listed above
4. Click **"Done"**

### Step 6: Activation

1. Click **"Continue"** to review your app
2. Add any additional information if required
3. Click **"Activate your app"**
4. Your app is now ready to use!

## 🔧 Part 2: Webhook Configuration

Webhooks allow real-time notifications when meetings start, end, or recordings are ready.

### Step 1: Add Webhook Endpoint

1. In your Zoom app, go to **"Feature"** tab
2. Find **"Event Subscriptions"** section
3. Click **"+ Add new event subscription"**

### Step 2: Configure Event Subscription

```
Subscription Name: LMS Meeting Events
Event notification endpoint URL: https://yourdomain.com/api/sessions/webhook
```

### Step 3: Event Types

Subscribe to these events:

#### Meeting Events:
- `meeting.started` - When meeting begins
- `meeting.ended` - When meeting ends

#### Recording Events:
- `recording.completed` - When cloud recording is ready
- `recording.transcript_completed` - When transcript is ready (optional)

### Step 4: Validate Endpoint

1. Click **"Validate"** next to your webhook URL
2. Zoom will send a validation request to your endpoint
3. Your LMS should respond with the challenge token
4. If validation passes, you'll see a green checkmark

### Step 5: Save Configuration

1. Click **"Save"**
2. Your webhook is now active

## 🏗️ Part 3: Account-Level Settings

Configure your Zoom account settings for optimal LMS integration.

### Step 1: Recording Settings

1. Go to [Zoom Admin Portal](https://admin.zoom.us/)
2. Navigate to **Account Management > Account Settings**
3. Go to **Recording** tab

#### Cloud Recording Settings:
```
☑️ Cloud recording
☑️ Record active speaker, gallery view and shared screen separately
☑️ Save panelist chat in the recording
☑️ Save participant chat in the recording
☑️ Save closed captions as a VTT file
☑️ Add a timestamp to the recording
☑️ Automatic recording (Host can start automatic recording)
☑️ Automatic deletion of cloud recordings
   └─ Delete after: 365 days (or your preference)
```

### Step 2: Meeting Settings

1. In **Account Settings**, go to **Meeting** tab

#### Recommended Settings:
```
☑️ Allow participants to join before host
☑️ Always show meeting controls
☑️ Allow users to select stereo audio during screen sharing
☑️ Enable waiting room
   └─ Settings: All participants (you can disable per meeting)
☑️ Always show meeting control toolbar
☑️ Show join from your browser link
```

### Step 3: Security Settings

```
☑️ Enable waiting room for instant meetings
☑️ Password requirement for scheduled meetings
☑️ Password requirement for instant meetings
☑️ Require password for participants joining by phone
```

## 🔒 Part 4: Environment Configuration

### Step 1: Update .env File

Add your Zoom credentials to `/api/.env`:

```env
# Zoom Integration Settings
ZOOM_ACCOUNT_ID=your_account_id_here
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here

# Optional: Legacy JWT (if still needed)
ZOOM_API_KEY=your_api_key_here
ZOOM_API_SECRET=your_api_secret_here

# Webhook Settings
ZOOM_WEBHOOK_SECRET_TOKEN=your_webhook_secret_token
```

### Step 2: Verify Integration

Test your integration with a simple API call:

```bash
# Test API connection
curl -X GET "https://api.zoom.us/v2/users/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🧪 Part 5: Testing Your Integration

### Test 1: Create Meeting

1. Create a session in your LMS
2. Check server logs for:
   ```
   Creating Zoom meeting with API...
   Zoom meeting created: [meeting details]
   ```
3. Verify meeting appears in your Zoom account

### Test 2: Start/Join Meeting

1. Start session as instructor
2. Should join as host with meeting controls
3. Have student join session
4. Should join as attendee without controls

### Test 3: Recording Processing

1. End a session after a few minutes
2. Check server logs for:
   ```
   Processing recordings for ended session...
   Successfully processed X recordings
   ```
3. Verify recording appears in LMS

### Test 4: Webhook Events

1. Monitor server logs during meeting lifecycle
2. Should see webhook events:
   ```
   Zoom webhook received: meeting.started
   Zoom webhook received: meeting.ended  
   Zoom webhook received: recording.completed
   ```

## 🔧 Part 6: Troubleshooting

### Common Issues and Solutions

#### Issue: "Invalid client credentials"
**Solution**: 
- Verify Account ID, Client ID, and Client Secret
- Ensure app is activated in Zoom marketplace
- Check for extra spaces or characters in .env file

#### Issue: "Insufficient privileges"
**Solution**:
- Add required scopes to your Zoom app
- Ensure your Zoom account has necessary permissions
- Verify app is published/activated

#### Issue: Webhook validation fails
**Solution**:
- Ensure your server is accessible from internet
- Check webhook endpoint responds to GET requests
- Verify webhook URL is correct (https required)

#### Issue: No recordings found
**Solution**:
- Cloud recording takes 2-5 minutes to process
- Check Zoom account recording settings
- Verify Pro/Business account (Basic doesn't support cloud recording)

#### Issue: Users join as attendees instead of host
**Solution**:
- Instructors should use startUrl (role=1)
- Students should use joinUrl (role=0)
- Check role assignment in join session logic

### Debug Commands

```bash
# Check Zoom API connectivity
curl -X POST https://zoom.us/oauth/token \
  -u "CLIENT_ID:CLIENT_SECRET" \
  -d "grant_type=account_credentials&account_id=ACCOUNT_ID"

# Test webhook endpoint
curl -X POST https://yourdomain.com/api/sessions/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"endpoint.url_validation","payload":{"plainToken":"test"}}'

# Check meeting creation
curl -X GET "https://api.zoom.us/v2/users/me/meetings" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## 📊 Part 7: Monitoring and Maintenance

### Log Monitoring

Monitor these log patterns:

```bash
# Meeting creation
grep "Creating Zoom meeting" /var/log/lms-api.log

# Recording processing  
grep "Processing recordings" /var/log/lms-api.log

# Webhook events
grep "Zoom webhook received" /var/log/lms-api.log

# Errors
grep "Error.*Zoom" /var/log/lms-api.log
```

### Performance Metrics

Track these metrics:
- Meeting creation success rate
- Recording processing time
- Webhook delivery success rate
- API rate limit usage

### Regular Maintenance

#### Monthly:
- Review recording storage usage
- Check for failed webhook deliveries
- Verify app credentials haven't expired

#### Quarterly:
- Review and update scopes if needed
- Check for new Zoom API features
- Update integration documentation

## 🔐 Part 8: Security Best Practices

### Credential Management

1. **Environment Variables**: Store all secrets in .env files
2. **Secret Rotation**: Rotate client secrets regularly
3. **Access Control**: Limit who has access to Zoom credentials
4. **Logging**: Avoid logging sensitive data

### Webhook Security

1. **Verify Requests**: Validate webhook signatures
2. **HTTPS Only**: Use HTTPS for all webhook endpoints  
3. **Rate Limiting**: Implement rate limiting on webhook endpoints
4. **IP Filtering**: Whitelist Zoom IP ranges if possible

### Meeting Security

1. **Waiting Rooms**: Enable for sensitive meetings
2. **Passwords**: Require meeting passwords
3. **Recording Permissions**: Control who can access recordings
4. **Participant Management**: Monitor meeting participants

## 📚 Part 9: API Reference

### Key Endpoints Used

```javascript
// Create Meeting
POST https://api.zoom.us/v2/users/me/meetings

// Get Meeting
GET https://api.zoom.us/v2/meetings/{meetingId}

// Get Recordings
GET https://api.zoom.us/v2/meetings/{meetingId}/recordings

// List User Meetings
GET https://api.zoom.us/v2/users/me/meetings
```

### Webhook Events

```javascript
// Meeting Started
{
  "event": "meeting.started",
  "payload": {
    "account_id": "abc123",
    "object": {
      "id": "123456789",
      "topic": "My Meeting",
      "start_time": "2023-01-01T10:00:00Z"
    }
  }
}

// Recording Completed
{
  "event": "recording.completed", 
  "payload": {
    "account_id": "abc123",
    "object": {
      "id": "123456789",
      "topic": "My Meeting",
      "recording_files": [...]
    }
  }
}
```

## 🎓 Part 10: Advanced Configuration

### Custom Meeting Settings

You can customize meeting settings per session type:

```javascript
// Live Class Settings
const liveClassSettings = {
  host_video: true,
  participant_video: true,
  join_before_host: true,
  mute_upon_entry: true,
  waiting_room: false,
  auto_recording: 'cloud'
};

// Exam/Assessment Settings  
const examSettings = {
  host_video: true,
  participant_video: true,
  join_before_host: false,
  mute_upon_entry: true,
  waiting_room: true,
  auto_recording: 'none'
};
```

### Recording Management

```javascript
// Auto-delete old recordings
const cleanupOldRecordings = async () => {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 12); // 1 year old
  
  const oldRecordings = await Recording.find({
    recordedAt: { $lt: cutoffDate }
  });
  
  for (const recording of oldRecordings) {
    // Delete from Zoom and database
    await zoomIntegration.deleteRecording(recording.zoomRecordingId);
    await recording.remove();
  }
};
```

## 🆘 Support and Resources

### Zoom Resources
- [Zoom API Documentation](https://developers.zoom.us/docs/api/)
- [Zoom Webhook Documentation](https://developers.zoom.us/docs/api/rest/webhook-reference/)
- [Zoom Developer Forum](https://devforum.zoom.us/)

### LMS Integration Support
- Check server logs first
- Test with simple API calls
- Verify webhook connectivity
- Review account permissions

### Getting Help
1. Check this documentation first
2. Review server logs for specific errors
3. Test individual components (API, webhooks, etc.)
4. Contact Zoom Developer Support if needed

---

## ✅ Completion Checklist

Before going live, verify:

- [ ] Zoom app created and activated
- [ ] All required scopes added
- [ ] Webhook endpoint configured and validated
- [ ] Environment variables set correctly
- [ ] Test meeting creation works
- [ ] Recording processing works
- [ ] Webhook events received
- [ ] Role-based meeting access works
- [ ] Security settings configured

**🎉 Your Zoom integration is now complete and ready for production use!**


