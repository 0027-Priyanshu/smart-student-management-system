"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
const cloudinary_1 = require("cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;
if (isCloudinaryConfigured) {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('☁️  Cloudinary File Upload Service initialized.');
}
else {
    console.log('☁️  Cloudinary credentials missing. Defaulting to Local Disk Storage (/uploads).');
}
async function uploadFile(localFilePath, folderName = 'edumanager') {
    if (isCloudinaryConfigured) {
        try {
            const response = await cloudinary_1.v2.uploader.upload(localFilePath, {
                folder: folderName,
                resource_type: 'auto'
            });
            if (fs_1.default.existsSync(localFilePath)) {
                fs_1.default.unlinkSync(localFilePath);
            }
            return response.secure_url;
        }
        catch (error) {
            console.error('Cloudinary upload error, falling back to local file URL:', error);
        }
    }
    const filename = localFilePath.split(/[\\/]/).pop();
    return `/uploads/${filename}`;
}
