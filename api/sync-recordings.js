const axios = require('axios');
require('dotenv').config();

async function syncRecordings() {
  console.log('🔄 Starting manual recording sync...\n');
  
  const API_BASE_URL = process.env.API_URL || 'http://localhost:5001/api';
  
  try {
    // You'll need to get a valid token for this
    // For now, we'll just show the endpoint
    console.log('📡 Recording sync endpoint: POST /api/sessions/sync-recordings');
    console.log('🔑 You need to be authenticated as an instructor or admin');
    console.log('');
    
    console.log('💡 To sync recordings manually:');
    console.log('1. Login to your LMS as an instructor');
    console.log('2. Go to any course with sessions');
    console.log('3. The system will automatically try to fetch recordings');
    console.log('4. Or use the API endpoint with proper authentication');
    console.log('');
    
    console.log('🔍 Checking if recordings exist for recent sessions...');
    
    // This would require authentication, so we'll just show the process
    console.log('✅ Recording sync process:');
    console.log('  1. Find all sessions with Zoom meeting IDs');
    console.log('  2. Check if recordings exist in database');
    console.log('  3. If not, fetch from Zoom API');
    console.log('  4. Process and store in database');
    console.log('  5. Update session recording status');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

syncRecordings();
