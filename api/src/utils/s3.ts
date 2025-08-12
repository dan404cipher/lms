import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// Upload file to S3
export const uploadToS3 = async (file: Express.Multer.File, folder: string): Promise<AWS.S3.ManagedUpload.SendData> => {
  const fileExtension = file.originalname.split('.').pop();
  const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

  const params: AWS.S3.PutObjectRequest = {
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read',
    Metadata: {
      originalName: file.originalname,
      uploadedAt: new Date().toISOString()
    }
  };

  try {
    const result = await s3.upload(params).promise();
    return result;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

// Delete file from S3
export const deleteFromS3 = async (fileUrl: string): Promise<void> => {
  try {
    // Extract key from URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key
    };

    await s3.deleteObject(params).promise();
    console.log(`File deleted from S3: ${key}`);
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('Failed to delete file from S3');
  }
};

// Generate signed URL for private files
export const generateSignedUrl = async (key: string, expiresIn: number = 3600): Promise<string> => {
  const params: AWS.S3.GetObjectRequest = {
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key
  };

  try {
    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      ...params,
      Expires: expiresIn
    });
    return signedUrl;
  } catch (error) {
    console.error('S3 signed URL generation error:', error);
    throw new Error('Failed to generate signed URL');
  }
};

// List files in a folder
export const listFilesInFolder = async (folder: string): Promise<AWS.S3.ListObjectsV2Output> => {
  const params: AWS.S3.ListObjectsV2Request = {
    Bucket: process.env.AWS_S3_BUCKET!,
    Prefix: folder
  };

  try {
    const result = await s3.listObjectsV2(params).promise();
    return result;
  } catch (error) {
    console.error('S3 list files error:', error);
    throw new Error('Failed to list files from S3');
  }
};

// Copy file within S3
export const copyFileInS3 = async (sourceKey: string, destinationKey: string): Promise<AWS.S3.CopyObjectOutput> => {
  const params: AWS.S3.CopyObjectRequest = {
    Bucket: process.env.AWS_S3_BUCKET!,
    CopySource: `${process.env.AWS_S3_BUCKET}/${sourceKey}`,
    Key: destinationKey,
    ACL: 'public-read'
  };

  try {
    const result = await s3.copyObject(params).promise();
    return result;
  } catch (error) {
    console.error('S3 copy file error:', error);
    throw new Error('Failed to copy file in S3');
  }
};

// Get file metadata
export const getFileMetadata = async (key: string): Promise<AWS.S3.HeadObjectOutput> => {
  const params: AWS.S3.HeadObjectRequest = {
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key
  };

  try {
    const result = await s3.headObject(params).promise();
    return result;
  } catch (error) {
    console.error('S3 get metadata error:', error);
    throw new Error('Failed to get file metadata from S3');
  }
};
