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

  async createMeeting(meetingData: ZoomMeetingData): Promise<ZoomMeeting> {
    try {
      if (!this.clientId || !this.clientSecret || !this.accountId) {
        console.log('Zoom credentials not configured, using mock meeting');
        // Return mock data if Zoom credentials are not configured
        return this.createMockMeeting(meetingData);
      }

      console.log('Creating Zoom meeting with API...');
      const response = await axios.post(
        `${this.baseUrl}/users/me/meetings`,
        {
          topic: meetingData.topic,
          type: 2, // Scheduled meeting
          start_time: meetingData.start_time,
          duration: meetingData.duration,
          timezone: meetingData.timezone || 'UTC',
          password: meetingData.password,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: true,  // Allow students to join before instructor
            mute_upon_entry: true,
            waiting_room: false,     // Disable waiting room for easier access
            auto_recording: 'local', // Use local recording (works with free plans)
            recording_authentication: false, // Allow anyone to view recordings
            allow_multiple_devices: true,
            ...meetingData.settings
          }
        },
        { headers: await this.getHeaders() }
      );

      console.log('Zoom API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating Zoom meeting:', error);
      if (axios.isAxiosError(error)) {
        console.error('Zoom API error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      // Fallback to mock meeting if Zoom API fails
      return this.createMockMeeting(meetingData);
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

      const response = await axios.get(
        `${this.baseUrl}/meetings/${meetingId}/recordings`,
        { headers: await this.getHeaders() }
      );

      return response.data.recording_files || [];
    } catch (error) {
      console.error('Error getting Zoom recordings:', error);
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
    
    return {
      id: meetingId,
      topic: meetingData.topic,
      start_url: `https://zoom.us/s/${meetingId}?role=1`,
      join_url: `https://zoom.us/j/${meetingId}`,
      password: meetingData.password || 'mock123',
      h323_password: '123456',
      pstn_password: '123456',
      encrypted_password: 'encrypted_mock123',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: true,
        auto_recording: 'cloud',
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
    // Process and store recording information
    console.log('Recording completed:', payload.object.id);
  }

  // Download recording from Zoom to local storage
  async downloadRecordingToLocal(recordingData: any): Promise<string> {
    try {
      if (!this.clientId || !this.clientSecret || !this.accountId) {
        // Return mock file path for development
        return `/recordings/mock_${recordingData.id}.mp4`;
      }

      const headers = await this.getHeaders();
      const response = await axios.get(recordingData.download_url, {
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
          console.log(`Recording downloaded to: ${filePath}`);
          resolve(`/recordings/${fileName}`);
        });
        writer.on('error', reject);
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
