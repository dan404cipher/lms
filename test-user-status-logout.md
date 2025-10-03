# User Status Logout Implementation Test

## Overview
This document describes how to test the automatic logout functionality when an admin changes a user's status to inactive or suspended.

## Implementation Summary

### Backend Changes
1. **Auth Middleware** (`/api/src/middleware/auth.ts`):
   - Added status check in the `protect` middleware
   - Returns 401 with status information if user is not active

2. **User Model** (`/api/src/models/User.ts`):
   - Already has `status` field with values: `'active' | 'inactive' | 'suspended'`

3. **Admin Controller** (`/api/src/controllers/adminController.ts`):
   - Already has `toggleUserStatus` and `updateUser` functions to change user status

### Frontend Changes
1. **AuthContext** (`/client/src/contexts/AuthContext.tsx`):
   - Added periodic status check every 30 seconds
   - Added visibility change detection (when user switches back to tab)
   - Added API error handling for status-related errors
   - Added user notification when logged out due to status change

2. **Auth Service** (`/client/src/services/authService.ts`):
   - Added global error handler for status changes
   - Prevents token refresh retry for status-related 401 errors

## Testing Steps

### Prerequisites
1. Start the backend server: `cd api && npm run dev`
2. Start the frontend server: `cd client && npm run dev`
3. Have at least one regular user and one admin user

### Test Scenario 1: Admin Changes User Status to Inactive
1. Login as a regular user in one browser tab
2. Login as an admin in another browser tab (or use a different browser)
3. In the admin panel, find the regular user and change their status to "inactive"
4. **Expected Result**: The regular user should be automatically logged out within 30 seconds or immediately on next API call

### Test Scenario 2: Admin Changes User Status to Suspended
1. Login as a regular user in one browser tab
2. Login as an admin in another browser tab (or use a different browser)
3. In the admin panel, find the regular user and change their status to "suspended"
4. **Expected Result**: The regular user should be automatically logged out within 30 seconds or immediately on next API call

### Test Scenario 3: User Switches Back to Tab After Status Change
1. Login as a regular user
2. Switch to another tab
3. As admin, change the user's status to inactive/suspended
4. Switch back to the user's tab
5. **Expected Result**: The user should be immediately logged out when they return to the tab

### Test Scenario 4: API Call After Status Change
1. Login as a regular user
2. As admin, change the user's status to inactive/suspended
3. Try to perform any action that makes an API call (navigate to a page, etc.)
4. **Expected Result**: The user should be immediately logged out

## Verification Points

### Backend Verification
- Check that the auth middleware returns proper error response:
  ```json
  {
    "message": "Account is inactive or suspended",
    "status": "inactive" // or "suspended"
  }
  ```

### Frontend Verification
- Check browser console for logout messages
- Verify that localStorage tokens are cleared
- Verify that user is redirected to login page
- Check that user sees notification about account status

## API Endpoints for Testing

### Admin Endpoints (require admin authentication)
- `PATCH /api/admin/users/:userId/toggle-status` - Toggle user status
- `PUT /api/admin/users/:userId` - Update user (including status)
- `GET /api/admin/users` - List all users

### User Endpoints (will be blocked if status is not active)
- `GET /api/auth/profile` - Get user profile
- Any other protected endpoint

## Notes
- The status check runs every 30 seconds by default
- Users are also checked when they switch back to the tab
- Any API call that returns a 401 with status information will trigger immediate logout
- The implementation handles both immediate and delayed status changes

