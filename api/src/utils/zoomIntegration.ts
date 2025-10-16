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
  private tokenRefreshPromise: Promise<string> | null = null;
  private meetingCreationQueue: Promise<any> = Promise.resolve();

  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
    this.clientId = process.env.ZOOM_CLIENT_ID || '';
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || '';

    console.log('Zoom Integration initialized with:');
    console.log('Account ID:', this.accountId ? 'Set' : 'Not set');
    console.log('Client ID:', this.clientId ? 'Set' : 'Not set');
    console.log('Client Secret:', this.clientSecret ? 'Set' : 'Not set');
  }

  private async getAccessToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // If there's already a token refresh in progress, wait for it
    if (this.tokenRefreshPromise) {
      return await this.tokenRefreshPromise;
    }

    // Start a new token refresh
    this.tokenRefreshPromise = this.refreshAccessToken();
    
    try {
      const token = await this.tokenRefreshPromise;
      return token;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  private async refreshAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret || !this.accountId) {
      throw new Error('Zoom credentials not configured');
    }

    console.log('🔄 Refreshing Zoom access token...');
    
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await axios.post(
      this.tokenUrl,
      `grant_type=account_credentials&account_id=${this.accountId}`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000; // Refresh 1 minute early
    
    console.log('✅ Zoom access token refreshed successfully');
    return this.accessToken!;
  }

  private async getHeaders() {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private generateMeetingPassword(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // -------------------
  // CREATE MEETING
  // -------------------
  async createMeeting(meetingData: ZoomMeetingData, userEmail?: string): Promise<ZoomMeeting> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.clientId || !this.clientSecret || !this.accountId) {
          throw new Error('Zoom credentials not configured');
        }

        if (!meetingData.topic || !meetingData.start_time || !meetingData.duration) {
          throw new Error('Meeting topic, start_time, and duration are required');
        }

        const startTime = new Date(meetingData.start_time);
        if (startTime <= new Date()) throw new Error('Meeting start time must be in the future');

        const meetingPayload = {
          topic: meetingData.topic.substring(0, 200),
          type: 2, 
          start_time: meetingData.start_time,
          duration: meetingData.duration,
          timezone: meetingData.timezone || 'UTC',
          password: meetingData.password || this.generateMeetingPassword(),
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: true,
            mute_upon_entry: true,
            waiting_room: false,
            auto_recording: 'cloud',
            allow_multiple_devices: true,
            ...meetingData.settings,
          },
        };

        const targetUser = userEmail || 'me';
        console.log(`🔄 Creating Zoom meeting (attempt ${attempt}/${maxRetries}) for user: ${targetUser}`);
        
        const response = await axios.post(
          `${this.baseUrl}/users/${encodeURIComponent(targetUser)}/meetings`,
          meetingPayload,
          { 
            headers: await this.getHeaders(),
            timeout: 15000, // 15 second timeout
          }
        );

        console.log('✅ Zoom meeting created successfully for user:', targetUser, 'ID:', response.data.id);
        return response.data;
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Error creating Zoom meeting (attempt ${attempt}/${maxRetries}):`, error.message);
        
        // Check if it's a token-related error that might be resolved by retrying
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('🔄 Token error detected, clearing cached token and retrying...');
          this.accessToken = null;
          this.tokenExpiry = 0;
          this.tokenRefreshPromise = null;
        }
        
        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('❌ Failed to create Zoom meeting after all retries');
    throw lastError;
  }

  // -------------------
  // CREATE MEETING (QUEUED)
  // -------------------
  async createMeetingQueued(meetingData: ZoomMeetingData, userEmail?: string): Promise<ZoomMeeting> {
    // Queue the meeting creation to prevent concurrent requests
    this.meetingCreationQueue = this.meetingCreationQueue.then(async () => {
      // Add a small delay between sequential requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.createMeeting(meetingData, userEmail);
    }).catch(error => {
      console.error('Error in meeting creation queue:', error);
      throw error;
    });

    return this.meetingCreationQueue;
  }

  // -------------------
  // UPDATE MEETING
  // -------------------
  async updateMeeting(meetingId: string, updateData: Partial<ZoomMeetingData>): Promise<void> {
    try {
      if (!this.clientId || !this.clientSecret || !this.accountId) return;

      await axios.patch(`${this.baseUrl}/meetings/${meetingId}`, updateData, {
        headers: await this.getHeaders(),
      });
    } catch (error) {
      console.error('Error updating Zoom meeting:', error);
    }
  }

  // -------------------
  // DELETE MEETING
  // -------------------
  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      if (!this.clientId || !this.clientSecret || !this.accountId) return;

      await axios.delete(`${this.baseUrl}/meetings/${meetingId}`, {
        headers: await this.getHeaders(),
      });
    } catch (error) {
      console.error('Error deleting Zoom meeting:', error);
    }
  }

  // -------------------
  // GET MEETING RECORDINGS
  // -------------------
  async getMeetingRecordings(meetingId: string): Promise<any[]> {
    try {
      if (!this.clientId || !this.clientSecret || !this.accountId) {
        console.log('MOCK MODE: Returning mock recordings');
        return [
          {
            id: `rec_${meetingId}`,
            meeting_id: meetingId,
            recording_start: new Date().toISOString(),
            recording_end: new Date(Date.now() + 3600000).toISOString(),
            topic: 'Mock Recording',
            total_size: 1024 * 1024 * 100,
            recording_count: 1,
            share_url: `https://zoom.us/rec/share/mock_${meetingId}`,
            recording_files: [
              {
                id: `file_${meetingId}`,
                meeting_id: meetingId,
                recording_start: new Date().toISOString(),
                recording_end: new Date(Date.now() + 3600000).toISOString(),
                file_type: 'MP4',
                file_size: 1024 * 1024 * 100,
                play_url: `https://zoom.us/rec/play/mock_${meetingId}`,
                download_url: `https://zoom.us/rec/download/mock_${meetingId}`,
              },
            ],
          },
        ];
      }

      const response = await axios.get(`${this.baseUrl}/meetings/${meetingId}/recordings`, {
        headers: await this.getHeaders(),
      });

      return [
        {
          id: response.data.uuid || response.data.id,
          meeting_id: meetingId,
          recording_start: response.data.start_time,
          recording_end: response.data.end_time,
          topic: response.data.topic,
          total_size: response.data.total_size,
          recording_count: response.data.recording_count,
          share_url: response.data.share_url,
          recording_files: response.data.recording_files || [],
        },
      ];
    } catch (error) {
      console.error('Error fetching Zoom recordings:', error);
      return [];
    }
  }

  // -------------------
  // PROCESS SESSION RECORDINGS
  // -------------------
  async processSessionRecordings(sessionId: string, meetingId: string): Promise<any[]> {
    try {
      const recordings = await this.getMeetingRecordings(meetingId);
      if (!recordings.length) return [];

      const { Recording } = await import('../models/Recording');
      const { Session } = await import('../models/Session');
      const session = await Session.findById(sessionId);
      if (!session) throw new Error('Session not found');

      const processed: any[] = [];

      for (const recording of recordings) {
        for (const file of recording.recording_files || []) {
          if (file.file_type !== 'MP4' || file.recording_type === 'audio_only') continue;

          const recordingData = {
            sessionId: session._id,
            courseId: session.courseId,
            zoomRecordingId: file.id,
            title: `${recording.topic} ${file.recording_type || ''}`,
            recordingUrl: file.play_url,
            downloadUrl: file.download_url,
            duration: Math.floor(
              new Date(file.recording_end).getTime() - new Date(file.recording_start).getTime()
            ),
            fileSize: file.file_size,
            recordedAt: new Date(file.recording_start),
            isPublic: false,
            isProcessed: true,
            thumbnailUrl: file.thumbnail_url,
          };

          const newRec = await Recording.create(recordingData);
          processed.push(newRec);
        }
      }

      if (processed.length) {
        await Session.findByIdAndUpdate(sessionId, { hasRecording: true });
      }

      return processed;
    } catch (error) {
      console.error('Error processing session recordings:', error);
      return [];
    }
  }

  // -------------------
  // START MEETING
  // -------------------
  async startMeeting(meetingId: string): Promise<{ success: boolean; start_url?: string }> {
    try {
      return {
        success: true,
        start_url: `https://zoom.us/s/${meetingId}?role=1`,
      };
    } catch (error) {
      console.error('Error starting Zoom meeting:', error);
      return { success: false };
    }
  }

  // -------------------
  // MOCK MEETING CREATION
  // -------------------
  private createMockMeeting(meetingData: ZoomMeetingData): ZoomMeeting {
    const mockId = Math.floor(Math.random() * 90000000000) + 10000000000;
    const meetingId = mockId.toString();
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    return {
      id: meetingId,
      topic: meetingData.topic,
      start_url: `${baseUrl}/mock-meeting/${meetingId}?role=host&title=${encodeURIComponent(
        meetingData.topic
      )}`,
      join_url: `${baseUrl}/mock-meeting/${meetingId}?role=participant&title=${encodeURIComponent(
        meetingData.topic
      )}`,
      password: meetingData.password || 'mock123',
      h323_password: '123456',
      pstn_password: '123456',
      encrypted_password: 'encrypted_mock123',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: true,
        waiting_room: false,
        auto_recording: 'cloud',
        allow_multiple_devices: true,
        ...meetingData.settings,
      },
    };
  }

  // -------------------
  // WEBHOOK HANDLER
  // -------------------
  async handleWebhook(event: any): Promise<void> {
    try {
      switch (event.event) {
        case 'meeting.started':
          console.log('Meeting started:', event.payload.object.id);
          break;
        case 'meeting.ended':
          console.log('Meeting ended:', event.payload.object.id);
          break;
        case 'recording.completed':
          const meetingId = event.payload.object.id;
          const { Session } = await import('../models/Session');
          const session = await Session.findOne({ zoomMeetingId: meetingId });
          if (!session) return;

          await this.processSessionRecordings((session._id as any).toString(), meetingId);
          break;
        default:
          console.log('Unhandled Zoom webhook event:', event.event);
      }
    } catch (error) {
      console.error('Error handling Zoom webhook:', error);
    }
  }

  // -------------------
  // DOWNLOAD RECORDING
  // -------------------
  async downloadRecordingToLocal(recordingData: any): Promise<string> {
    try {
      if (!this.clientId || !this.clientSecret || !this.accountId)
        return `/recordings/mock_${recordingData.id}.mp4`;

      const downloadUrl = recordingData.download_url || recordingData.recording_files?.[0]?.download_url;
      if (!downloadUrl) throw new Error('No download URL');

      const headers = await this.getHeaders();
      const response = await axios.get(downloadUrl, { headers, responseType: 'stream' });

      const recordingsDir = path.join(process.cwd(), 'recordings');
      if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true });

      const fileName = `${recordingData.id}_${Date.now()}.mp4`;
      const filePath = path.join(recordingsDir, fileName);

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(`/recordings/${fileName}`));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading recording:', error);
      throw error;
    }
  }
}

export default new ZoomIntegration();
