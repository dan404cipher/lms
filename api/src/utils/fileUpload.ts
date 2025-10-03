import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Create uploads directory if it doesn't exist
const uploadsDir = path.resolve(__dirname, '../../uploads');
const lessonContentDir = path.join(uploadsDir, 'lesson-content');
const assessmentDir = path.join(uploadsDir, 'assessments');
const assessmentAttachmentDir = path.join(uploadsDir, 'assessment-attachments');

// Ensure directories exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(lessonContentDir)) {
  fs.mkdirSync(lessonContentDir, { recursive: true });
}
if (!fs.existsSync(assessmentDir)) {
  fs.mkdirSync(assessmentDir, { recursive: true });
}
if (!fs.existsSync(assessmentAttachmentDir)) {
  fs.mkdirSync(assessmentAttachmentDir, { recursive: true });
}

// Upload file locally
export const uploadFileLocally = async (file: Express.Multer.File, folder: string = 'lesson-content'): Promise<{ Location: string; Key: string }> => {
  try {
    console.log('Starting file upload:', { 
      originalName: file.originalname, 
      mimetype: file.mimetype, 
      size: file.size,
      folder 
    });
    
    const fileExtension = file.originalname.split('.').pop() || 'file';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const folderPath = path.join(uploadsDir, folder);
    
    console.log('Folder path:', folderPath);
    
    // Create folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      console.log('Creating folder:', folderPath);
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    const filePath = path.join(folderPath, fileName);
    console.log('File path:', filePath);
    
    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);
    console.log('File written successfully');
    
    // Return the file URL (relative to the API base URL)
    const fileUrl = `/uploads/${folder}/${fileName}`;
    
    console.log(`File uploaded locally: ${filePath}`);
    console.log('File URL:', fileUrl);
    
    return {
      Location: fileUrl,
      Key: `${folder}/${fileName}`
    };
  } catch (error) {
    console.error('Local upload error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Failed to upload file locally: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Delete file locally
export const deleteFileLocally = async (fileUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const urlPath = fileUrl.replace('/uploads/', '');
    const filePath = path.join(uploadsDir, urlPath);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`File deleted locally: ${filePath}`);
    }
  } catch (error) {
    console.error('Local delete error:', error);
    throw new Error('Failed to delete file locally');
  }
};

// Upload assessment attachment file locally
export const uploadAssessmentAttachment = async (file: Express.Multer.File): Promise<{ Location: string; Key: string }> => {
  return uploadFileLocally(file, 'assessment-attachments');
};

// Upload assessment submission file locally
export const uploadAssessmentSubmission = async (file: Express.Multer.File): Promise<{ Location: string; Key: string }> => {
  return uploadFileLocally(file, 'assessments');
};

// Get file metadata
export const getFileMetadata = async (fileUrl: string): Promise<{ size: number; lastModified: Date }> => {
  try {
    const urlPath = fileUrl.replace('/uploads/', '');
    const filePath = path.join(uploadsDir, urlPath);
    
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    
    const stats = fs.statSync(filePath);
    
    return {
      size: stats.size,
      lastModified: stats.mtime
    };
  } catch (error) {
    console.error('Get file metadata error:', error);
    throw new Error('Failed to get file metadata');
  }
};
