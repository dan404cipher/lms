# Zoom Integration Setup Guide

## Overview
The LMS now includes full Zoom integration for live sessions with automatic recording capabilities.

## Features Implemented

### 1. Session Scheduling
- **Enhanced Schedule Session Modal** with professional UI matching the reference design
- **Real-time calendar** with clickable dates and week navigation
- **Form validation** with required fields and proper error handling
- **Timezone support** with multiple timezone options
- **Session types**: Live Class, Office Hours, Review Session
- **Duration options**: 30 minutes to 3 hours
- **Max participants** setting (optional)

### 2. Zoom Integration
- **Automatic Zoom meeting creation** when scheduling sessions
- **JWT-based authentication** with Zoom API
- **Meeting settings**: Auto-recording, waiting room, mute on entry
- **Start/Join URLs** for instructors and students
- **Mock integration** that works without Zoom credentials

### 3. Session Management
- **Live session status** tracking (upcoming/live/ended)
- **Start/End session** functionality for instructors
- **Join session** capability for students
- **Real-time status updates** in the UI

### 4. Recording Management
- **Automatic recording** with cloud storage
- **Recording playback** directly in the platform
- **Download functionality** for instructors and students
- **Recording metadata** tracking (duration, view count, etc.)

## Setup Instructions

### 1. Zoom API Credentials
Add these environment variables to your `.env` file in the `api` directory:

```env
ZOOM_API_KEY=your_zoom_api_key_here
ZOOM_API_SECRET=your_zoom_api_secret_here
```

### 2. Zoom App Configuration
1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Create a new JWT app (or Server-to-Server OAuth app for newer implementations)
3. Get your API Key and API Secret
4. Configure webhooks for:
   - Meeting started
   - Meeting ended
   - Recording completed

### 3. Webhook Endpoint
The system is ready for Zoom webhooks at: `POST /api/sessions/webhook`

### 4. Database Schema
The Session model includes all necessary fields:
- `zoomMeetingId`: Zoom meeting ID
- `joinUrl`: Zoom join URL
- `recordingUrl`: Cloud recording URL
- `hasRecording`: Boolean flag
- `status`: Session status tracking

## API Endpoints

### Session Management
- `POST /api/sessions` - Create new session
- `GET /api/sessions` - Get sessions (with course filter)
- `GET /api/sessions/:id` - Get specific session
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session
- `POST /api/sessions/:id/start` - Start session (instructor)
- `POST /api/sessions/:id/end` - End session (instructor)
- `POST /api/sessions/:id/join` - Join session (student)

### Recording Management
- `GET /api/sessions/recordings` - Get all recordings (with course filter)
- `GET /api/sessions/:id/recordings` - Get recordings for specific session
- `GET /api/sessions/recordings/:recordingId/download` - Download recording

### Attendance
- `GET /api/sessions/:id/attendance` - Get session attendance
- `POST /api/sessions/:id/attendance` - Mark attendance

## Usage

### For Instructors
1. Navigate to course detail page
2. Click "Sessions" tab
3. Click "Schedule Session" button
4. Fill in session details in the modal
5. Select date/time from the calendar
6. Click "Create Session"
7. Start sessions when ready
8. View and manage recordings

### For Students
1. View scheduled sessions in course detail
2. Join live sessions when they start
3. Access recordings after sessions end
4. Download recordings for offline viewing

## Mock Mode
The system works in mock mode without Zoom credentials:
- Creates placeholder meeting IDs
- Generates mock join URLs
- Simulates recording functionality
- All UI features work normally

## Production Deployment
1. Set up Zoom API credentials
2. Configure webhook endpoints
3. Set up cloud storage for recordings
4. Test with real Zoom meetings
5. Monitor webhook events

## Security Notes
- JWT tokens expire after 1 hour
- All endpoints require authentication
- Instructors can only manage their own course sessions
- Students can only join sessions for enrolled courses
- Recording access is controlled by course enrollment

## Troubleshooting
- Check API logs for Zoom API errors
- Verify webhook URL is accessible
- Ensure MongoDB is running
- Check environment variables are set
- Test with mock mode first
