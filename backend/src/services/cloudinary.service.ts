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
      console.error('Cloudinary upload error, falling back to Data URI / local storage:', error);
    }
  }

  // Fallback for local disk storage / persistence:
  // Read file into base64 Data URI so it persists in MongoDB across Render redeployments & restarts!
  try {
    if (fs.existsSync(localFilePath)) {
      const fileBuffer = fs.readFileSync(localFilePath);
      const ext = localFilePath.split('.').pop()?.toLowerCase() || 'png';
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
      const base64Data = fileBuffer.toString('base64');
      
      // Clean up temp file
      try { fs.unlinkSync(localFilePath); } catch (e) {}

      return `data:${mimeType};base64,${base64Data}`;
    }
  } catch (err) {
    console.error('Error converting file to Data URI:', err);
  }

  const filename = localFilePath.split(/[\\/]/).pop();
  return `/uploads/${filename}`;
}
