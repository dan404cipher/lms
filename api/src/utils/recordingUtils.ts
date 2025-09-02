import fs from 'fs';
import path from 'path';

export class RecordingUtils {
  private static recordingsDir = path.join(process.cwd(), 'recordings');

  /**
   * Ensure the recordings directory exists
   */
  static ensureRecordingsDirectory(): void {
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true });
      console.log('Created recordings directory:', this.recordingsDir);
    }
  }

  /**
   * Get the full path to a recording file
   */
  static getRecordingPath(fileName: string): string {
    this.ensureRecordingsDirectory();
    return path.join(this.recordingsDir, fileName);
  }

  /**
   * Check if a recording file exists
   */
  static recordingExists(fileName: string): boolean {
    const filePath = this.getRecordingPath(fileName);
    return fs.existsSync(filePath);
  }

  /**
   * Get all recording files in the directory
   */
  static getAllRecordings(): string[] {
    this.ensureRecordingsDirectory();
    try {
      return fs.readdirSync(this.recordingsDir).filter(file => 
        file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mov')
      );
    } catch (error) {
      console.error('Error reading recordings directory:', error);
      return [];
    }
  }

  /**
   * Delete a recording file
   */
  static deleteRecording(fileName: string): boolean {
    try {
      const filePath = this.getRecordingPath(fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Deleted recording file:', filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting recording file:', error);
      return false;
    }
  }

  /**
   * Get recording file stats
   */
  static getRecordingStats(fileName: string): fs.Stats | null {
    try {
      const filePath = this.getRecordingPath(fileName);
      if (fs.existsSync(filePath)) {
        return fs.statSync(filePath);
      }
      return null;
    } catch (error) {
      console.error('Error getting recording stats:', error);
      return null;
    }
  }

  /**
   * Clean up old recording files (older than specified days)
   */
  static cleanupOldRecordings(daysOld: number = 30): number {
    this.ensureRecordingsDirectory();
    let deletedCount = 0;
    const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));

    try {
      const files = fs.readdirSync(this.recordingsDir);
      
      for (const file of files) {
        const filePath = path.join(this.recordingsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log('Deleted old recording file:', file);
        }
      }
    } catch (error) {
      console.error('Error during recording cleanup:', error);
    }

    return deletedCount;
  }
}
