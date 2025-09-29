const axios = require('axios');
require('dotenv').config();

async function testZoomConnection() {
  console.log('🧪 Testing Zoom API Connection...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('ZOOM_ACCOUNT_ID:', process.env.ZOOM_ACCOUNT_ID ? '✅ Set' : '❌ Not set');
  console.log('ZOOM_CLIENT_ID:', process.env.ZOOM_CLIENT_ID ? '✅ Set' : '❌ Not set');
  console.log('ZOOM_CLIENT_SECRET:', process.env.ZOOM_CLIENT_SECRET ? '✅ Set' : '❌ Not set');
  console.log('');

  if (!process.env.ZOOM_ACCOUNT_ID || !process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
    console.log('❌ Missing Zoom credentials. Please check your .env file.');
    return;
  }

  try {
    // Step 1: Get access token
    console.log('🔑 Getting access token...');
    const credentials = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await axios.post(
      'https://zoom.us/oauth/token',
      `grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✅ Access token obtained successfully');
    const accessToken = tokenResponse.data.access_token;

    // Step 2: Test user info
    console.log('👤 Testing user info...');
    const userResponse = await axios.get('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ User info retrieved:', {
      id: userResponse.data.id,
      email: userResponse.data.email,
      first_name: userResponse.data.first_name,
      last_name: userResponse.data.last_name
    });

    // Step 3: Test meeting creation
    console.log('📅 Testing meeting creation...');
    const meetingData = {
      topic: 'Test Meeting - LMS Integration',
      type: 2,
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      duration: 60,
      timezone: 'UTC',
      password: '123456',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: true,
        waiting_room: false,
        auto_recording: 'cloud',
        recording_authentication: false,
        allow_multiple_devices: true
      }
    };

    console.log('📤 Meeting data:', JSON.stringify(meetingData, null, 2));

    const meetingResponse = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      meetingData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Meeting created successfully!');
    console.log('Meeting details:', {
      id: meetingResponse.data.id,
      topic: meetingResponse.data.topic,
      start_time: meetingResponse.data.start_time,
      join_url: meetingResponse.data.join_url,
      start_url: meetingResponse.data.start_url
    });

    console.log('\n🎉 All tests passed! Your Zoom integration is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
      
      if (error.response.status === 400) {
        console.error('\n🔍 400 Error Analysis:');
        console.error('This usually means:');
        console.error('1. Invalid meeting data format');
        console.error('2. Missing required fields');
        console.error('3. Invalid date/time format');
        console.error('4. Invalid settings configuration');
        console.error('\nCheck the error data above for specific validation errors.');
      } else if (error.response.status === 401) {
        console.error('\n🔍 401 Error Analysis:');
        console.error('This means your API credentials are invalid.');
        console.error('Please check:');
        console.error('1. ZOOM_ACCOUNT_ID is correct');
        console.error('2. ZOOM_CLIENT_ID is correct');
        console.error('3. ZOOM_CLIENT_SECRET is correct');
        console.error('4. Your Zoom app is published/activated');
      } else if (error.response.status === 403) {
        console.error('\n🔍 403 Error Analysis:');
        console.error('This means your app lacks required permissions.');
        console.error('Please check:');
        console.error('1. Required scopes are enabled in your Zoom app');
        console.error('2. Your Zoom account has the required plan');
        console.error('3. Your app is properly configured');
      }
    }
  }
}

testZoomConnection();
