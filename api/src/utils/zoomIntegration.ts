import axios from 'axios';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

interface ZoomMeetingData {
  topic: string;
  start_time: string;
  duration: number;
  timezone?: string;
  password?: string;
  settings?: {
    host_video?: boolean;
    participant_video?: boolean;
    join_before_host?: boolean;
    mute_upon_entry?: boolean;
    waiting_room?: boolean;
    auto_recording?: 'local' | 'cloud' | 'none';
    allow_multiple_devices?: boolean;
  };
}

interface ZoomMeeting {
  id: string;
  topic: string;
  start_url: string;
  join_url: string;
  password: string;
  h323_password: string;
  pstn_password: string;
  encrypted_password: string;
  settings: any;
}

class ZoomIntegration {
  private accountId: string;
  private clientId: string;
  private clientSecret: string;
  private baseUrl = 'https://api.zoom.us/v2';
  private tokenUrl = 'https://zoom.us/oauth/token';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
    this.clientId = process.env.ZOOM_CLIENT_ID || '';
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || '';
    
    console.log('Zoom Integration initialized with:');
    console.log('Account ID:', this.accountId ? 'Set' : 'Not set');
    console.log('Client ID:', this.clientId ? 'Set' : 'Not set');
    console.log('Client Secret:', this.clientSecret ? 'Set' : 'Not set');
    console.log('Raw Account ID from env:', process.env.ZOOM_ACCOUNT_ID);
    console.log('Raw Client ID from env:', process.env.ZOOM_CLIENT_ID);
  }

  private async getAccessToken(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      if (!this.clientId || !this.clientSecret || !this.accountId) {
        throw new Error('Zoom credentials not configured');
      }

      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        this.tokenUrl,
        `grant_type=account_credentials&account_id=${this.accountId}`,
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer

      return this.accessToken!;
    } catch (error) {
      console.error('Error getting Zoom access token:', error);
      throw new Error('Failed to authenticate with Zoom');
    }
  }

  private async getHeaders() {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private generateMeetingPassword(): string {
    // Generate a random 6-digit password for the meeting
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createMeeting(meetingData: ZoomMeetingData): Promise<ZoomMeeting> {
    try {
      if (!this.clientId || !this.clientSecret || !this.accountId) {
        console.log('❌ Zoom credentials not configured!');
        console.log('📝 Please add ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET to your .env file');
        console.log('🔗 Get credentials from: https://marketplace.zoom.us/');
        throw new Error('Zoom credentials not configured. Please set up your Zoom API credentials.');
      }

      // Validate meeting data
      if (!meetingData.topic || meetingData.topic.trim().length === 0) {
        throw new Error('Meeting topic is required');
      }
      
      if (!meetingData.start_time) {
        throw new Error('Meeting start time is required');
      }
      
      if (!meetingData.duration || meetingData.duration < 1) {
        throw new Error('Meeting duration must be at least 1 minute');
      }

      // Ensure start_time is in the future
      const startTime = new Date(meetingData.start_time);
      const now = new Date();
      if (startTime <= now) {
        throw new Error('Meeting start time must be in the future');
      }

      console.log('🚀 Creating real Zoom meeting with API...');
      console.log('Meeting data being sent:', {
        topic: meetingData.topic,
        start_time: meetingData.start_time,
        duration: meetingData.duration,
        timezone: meetingData.timezone,
        settings: {
          auto_recording: 'cloud', // Use cloud recording (Pro plan feature)
          join_before_host: true,
          waiting_room: false
        }
      });
      
      // Prepare the meeting data according to Zoom API requirements
      const meetingPayload = {
        topic: meetingData.topic.substring(0, 200), // Zoom has a 200 character limit
        type: 2, // Scheduled meeting
        start_time: meetingData.start_time,
        duration: parseInt(meetingData.duration.toString()),
        timezone: meetingData.timezone || 'UTC',
        password: meetingData.password || this.generateMeetingPassword(),
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: true,
          waiting_room: false,
          auto_recording: 'cloud',
          recording_authentication: false,
          allow_multiple_devices: true,
          ...meetingData.settings
        }
      };

      console.log('📤 Sending meeting payload to Zoom API:', JSON.stringify(meetingPayload, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/users/me/meetings`,
        meetingPayload,
        { headers: await this.getHeaders() }
      );

      console.log('✅ Zoom meeting created successfully:', response.data.id);
      console.log('📹 Cloud recording enabled for meeting:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating Zoom meeting:', error);
      if (axios.isAxiosError(error)) {
        console.error('Zoom API error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers
          }
        });
        
        // Log the request data that was sent
        console.error('Request data that was sent:', {
          topic: meetingData.topic,
          start_time: meetingData.start_time,
          duration: meetingData.duration,
          timezone: meetingData.timezone,
          settings: meetingData.settings
        });
        
        // Provide specific error messages
        if (error.response?.status === 400) {
          const errorMessage = error.response?.data?.message || 'Bad request';
          console.error('400 Error details:', error.response?.data);
          throw new Error(`Zoom API validation error: ${errorMessage}. Check your meeting data format.`);
        } else if (error.response?.status === 401) {
          throw new Error('Zoom authentication failed. Please check your API credentials.');
        } else if (error.response?.status === 403) {
          throw new Error('Zoom API access denied. Please check your app permissions and scopes.');
        } else if (error.response?.status === 429) {
          throw new Error('Zoom API rate limit exceeded. Please try again later.');
        }
      }
      throw error;
    }
  }

  async updateMeeting(meetingId: string, updateData: Partial<ZoomMeetingData>): Promise<void> {
    try {
      if (!this.clientId || !this.clientSecret || !this.accountId) {
        console.log('Mock: Updated Zoom meeting', meetingId, updateData);
        return;
      }

      await axios.patch(
        `${this.baseUrl}/meetings/${meetingId}`,
        updateData,
        { headers: await this.getHeaders() }
      );
    } catch (error) {
      console.error('Error updating Zoom meeting:', error);
    }
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      if (!this.clientId || !this.clientSecret || !this.accountId) {
        console.log('Mock: Deleted Zoom meeting', meetingId);
        return;
      }

      await axios.delete(
        `${this.baseUrl}/meetings/${meetingId}`,
        { headers: await this.getHeaders() }
      );
    } catch (error) {
      console.error('Error deleting Zoom meeting:', error);
    }
  }

  async getMeetingRecordings(meetingId: string): Promise<any[]> {
    try {
      if (!this.clientId || !this.clientSecret || !this.accountId) {
        console.log('⚠️  MOCK MODE: Zoom credentials not configured. Using mock recordings.');
        // Return mock recordings
        return [{
          id: `rec_${meetingId}`,
          meeting_id: meetingId,
          recording_start: new Date().toISOString(),
          recording_end: new Date(Date.now() + 3600000).toISOString(),
          topic: 'Mock Recording',
          total_size: 1024 * 1024 * 100, // 100MB
          recording_count: 1,
          share_url: `https://zoom.us/rec/share/mock_${meetingId}`,
          recording_files: [{
            id: `file_${meetingId}`,
            meeting_id: meetingId,
            recording_start: new Date().toISOString(),
            recording_end: new Date(Date.now() + 3600000).toISOString(),
            file_type: 'MP4',
            file_size: 1024 * 1024 * 100,
            play_url: `https://zoom.us/rec/play/mock_${meetingId}`,
            download_url: `https://zoom.us/rec/download/mock_${meetingId}`
          }]
        }];
      }

      console.log(`🔍 Fetching recordings for meeting: ${meetingId}`);
      const response = await axios.get(
        `${this.baseUrl}/meetings/${meetingId}/recordings`,
        { headers: await this.getHeaders() }
      );

      console.log(`📹 Found ${response.data.recording_files?.length || 0} recording files`);
      
      // Return the full recording data with files
      return [{
        id: response.data.uuid || response.data.id,
        meeting_id: meetingId,
        recording_start: response.data.start_time,
        recording_end: response.data.end_time,
        topic: response.data.topic,
        total_size: response.data.total_size,
        recording_count: response.data.recording_count,
        share_url: response.data.share_url,
        recording_files: response.data.recording_files || []
      }];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log(`📹 No recordings found for meeting ${meetingId} - this is normal if recording hasn't started or completed yet`);
        return [];
      }
      console.error('❌ Error getting Zoom recordings:', error);
      if (axios.isAxiosError(error)) {
        console.error('Recording API error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      return [];
    }
  }

  // Process and store recordings for a session
  async processSessionRecordings(sessionId: string, meetingId: string): Promise<any[]> {
    try {
      console.log(`Processing recordings for session ${sessionId}, meeting ${meetingId}`);
      
      const recordings = await this.getMeetingRecordings(meetingId);
      console.log(`Found ${recordings.length} recording files`);

      if (recordings.length === 0) {
        console.log('No recordings found yet. This is normal - Zoom recordings take 2-5 minutes to process.');
        return [];
      }

      // Import Recording model here to avoid circular dependencies
      const { Recording } = await import('../models/Recording');
      const { Session } = await import('../models/Session');
      
      const session = await Session.findById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const processedRecordings = [];

      for (const recording of recordings) {
        try {
          // Check if recording already exists
          const existingRecording = await Recording.findOne({ 
            zoomRecordingId: recording.id 
          });

          if (existingRecording) {
            console.log(`Recording ${recording.id} already exists, skipping...`);
            processedRecordings.push(existingRecording);
            continue;
          }

          // Calculate duration in seconds
          const startTime = new Date(recording.recording_start);
          const endTime = new Date(recording.recording_end);
          const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

          // Process each recording file
          for (const file of recording.recording_files || []) {
            try {
              // Download recording to local server
              let localFilePath = null;
              let localRecordingUrl = file.play_url; // Fallback to Zoom URL

              try {
                console.log(`📥 Downloading recording file ${file.id} to local server...`);
                localFilePath = await this.downloadRecordingToLocal({
                  id: file.id,
                  download_url: file.download_url,
                  recording_files: [file]
                });
                localRecordingUrl = `/recordings/${path.basename(localFilePath)}`;
                console.log(`✅ Recording file downloaded to: ${localFilePath}`);
              } catch (downloadError) {
                console.warn(`⚠️ Failed to download recording file ${file.id}:`, downloadError instanceof Error ? downloadError.message : 'Unknown error');
                console.log('Using Zoom URL as fallback');
              }

              // Create recording record for each file
              const recordingData = {
                sessionId: session._id,
                courseId: session.courseId,
                zoomRecordingId: file.id,
                title: `${recording.topic || session.title} - ${file.file_type || 'Recording'}`,
                description: `Recording of ${session.title} session`,
                recordingUrl: localRecordingUrl, // Use local URL if available
                downloadUrl: file.download_url,
                localFilePath: localFilePath, // Store local file path
                duration: Math.floor(file.recording_end ? (new Date(file.recording_end).getTime() - new Date(file.recording_start).getTime()) / 1000 : duration),
                fileSize: file.file_size || 0,
                recordedAt: new Date(file.recording_start || recording.recording_start),
                isPublic: false,
                isProcessed: true,
                thumbnailUrl: file.thumbnail_url
              };

              const newRecording = await Recording.create(recordingData);
              processedRecordings.push(newRecording);
              
              console.log(`Created recording record: ${newRecording._id}`);
            } catch (fileError) {
              console.error(`Error processing recording file ${file.id}:`, fileError);
            }
          }
        } catch (recordingError) {
          console.error(`Error processing recording ${recording.id}:`, recordingError);
        }
      }

      // Update session to mark as having recordings
      if (processedRecordings.length > 0) {
        await Session.findByIdAndUpdate(sessionId, { hasRecording: true });
        console.log(`Updated session ${sessionId} to mark as having recordings`);
      }

      return processedRecordings;
    } catch (error) {
      console.error('Error processing session recordings:', error);
      return [];
    }
  }

  async startMeeting(meetingId: string): Promise<{ success: boolean; start_url?: string }> {
    try {
      // In a real implementation, this might involve webhooks or real-time updates
      // For now, we'll return the start URL
      return {
        success: true,
        start_url: `https://zoom.us/s/${meetingId}?role=1` // Host role
      };
    } catch (error) {
      console.error('Error starting Zoom meeting:', error);
      return { success: false };
    }
  }

  private createMockMeeting(meetingData: ZoomMeetingData): ZoomMeeting {
    // Generate a more realistic mock meeting ID (11 digits like real Zoom IDs)
    const mockId = Math.floor(Math.random() * 90000000000) + 10000000000;
    const meetingId = mockId.toString();
    
    console.log('Creating mock meeting with ID:', meetingId);
    console.log('⚠️  MOCK MODE: Zoom credentials not configured. Using mock meeting for development.');
    console.log('📝 To use real Zoom meetings, configure ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET in your .env file');
    
    // For development, we'll create URLs that work with our mock meeting system
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    
    return {
      id: meetingId,
      topic: meetingData.topic,
      start_url: `${baseUrl}/mock-meeting/${meetingId}?role=host&title=${encodeURIComponent(meetingData.topic)}`,
      join_url: `${baseUrl}/mock-meeting/${meetingId}?role=participant&title=${encodeURIComponent(meetingData.topic)}`,
      password: meetingData.password || 'mock123',
      h323_password: '123456',
      pstn_password: '123456',
      encrypted_password: 'encrypted_mock123',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,  // Allow students to join before instructor
        mute_upon_entry: true,
        waiting_room: false,     // Disable waiting room for easier access
        auto_recording: 'cloud', // Use cloud recording (Pro plan feature)
        allow_multiple_devices: true,
        ...meetingData.settings
      }
    };
  }

  // Webhook handler for Zoom events
  async handleWebhook(event: any): Promise<void> {
    try {
      switch (event.event) {
        case 'meeting.started':
          await this.handleMeetingStarted(event.payload);
          break;
        case 'meeting.ended':
          await this.handleMeetingEnded(event.payload);
          break;
        case 'recording.completed':
          await this.handleRecordingCompleted(event.payload);
          break;
        default:
          console.log('Unhandled Zoom webhook event:', event.event);
      }
    } catch (error) {
      console.error('Error handling Zoom webhook:', error);
    }
  }

  private async handleMeetingStarted(payload: any): Promise<void> {
    // Update session status to 'live'
    console.log('Meeting started:', payload.object.id);
  }

  private async handleMeetingEnded(payload: any): Promise<void> {
    // Update session status to 'completed'
    console.log('Meeting ended:', payload.object.id);
  }

  private async handleRecordingCompleted(payload: any): Promise<void> {
    try {
      console.log('Recording completed webhook received:', payload);
      
      const meetingId = payload.object.id;
      const recordingId = payload.object.uuid;
      
      // Find the session by meeting ID
      const { Session } = await import('../models/Session');
      const session = await Session.findOne({ zoomMeetingId: meetingId });
      
      if (!session) {
        console.log(`No session found for meeting ID: ${meetingId}`);
        return;
      }

      console.log(`Processing recording for session: ${session._id}`);
      
      // Process the recordings
      const processedRecordings = await this.processSessionRecordings((session._id as any).toString(), meetingId);
      
      if (processedRecordings.length > 0) {
        console.log(`Successfully processed ${processedRecordings.length} recordings for session ${session._id}`);
      } else {
        console.log('No recordings were processed. This might be because recordings are still being processed by Zoom.');
      }
      
    } catch (error) {
      console.error('Error handling recording completed webhook:', error);
    }
  }

  // Download recording from Zoom to local storage
  async downloadRecordingToLocal(recordingData: any): Promise<string> {
    try {
      if (!this.clientId || !this.clientSecret || !this.accountId) {
        // Return mock file path for development
        return `/recordings/mock_${recordingData.id}.mp4`;
      }

      // Get the download URL from the recording data
      const downloadUrl = recordingData.download_url || recordingData.recording_files?.[0]?.download_url;
      
      if (!downloadUrl) {
        throw new Error('No download URL available for this recording');
      }

      console.log(`📥 Downloading recording from: ${downloadUrl}`);

      const headers = await this.getHeaders();
      const response = await axios.get(downloadUrl, {
        headers,
        responseType: 'stream'
      });

      // Create recordings directory if it doesn't exist
      const recordingsDir = path.join(process.cwd(), 'recordings');
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
        console.log('Created recordings directory:', recordingsDir);
      }

      // Generate unique filename
      const fileName = `${recordingData.id}_${Date.now()}.mp4`;
      const filePath = path.join(recordingsDir, fileName);

      // Create write stream
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✅ Recording downloaded to: ${filePath}`);
          resolve(`/recordings/${fileName}`);
        });
        writer.on('error', (error) => {
          console.error('Error writing recording file:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error downloading recording:', error);
      throw error;
    }
  }

  // Get local recording file
  async getLocalRecording(fileName: string): Promise<string> {
    const filePath = path.join(process.cwd(), 'recordings', fileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    throw new Error('Recording file not found');
  }

  // Delete local recording file
  async deleteLocalRecording(fileName: string): Promise<void> {
    const filePath = path.join(process.cwd(), 'recordings', fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Local recording deleted: ${filePath}`);
    }
  }
}

export default new ZoomIntegration();
