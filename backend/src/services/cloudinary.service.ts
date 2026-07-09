import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('☁️  Cloudinary File Upload Service initialized.');
} else {
  console.log('☁️  Cloudinary credentials missing. Defaulting to Local Disk Storage (/uploads).');
}

export async function uploadFile(localFilePath: string, folderName = 'edumanager'): Promise<string> {
  if (isCloudinaryConfigured) {
    try {
      const response = await cloudinary.uploader.upload(localFilePath, {
        folder: folderName,
        resource_type: 'auto'
      });
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
      return response.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error, falling back to local file URL:', error);
    }
  }

  const filename = localFilePath.split(/[\\/]/).pop();
  return `/uploads/${filename}`;
}
