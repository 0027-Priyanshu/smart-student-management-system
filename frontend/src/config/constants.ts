export const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp'
];

export const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

export const SIZE_ERROR_MESSAGE = 'Image is too large. Maximum allowed size is 5 MB.';
export const FORMAT_ERROR_MESSAGE = 'Unsupported file format! Only JPG, PNG, and WEBP image uploads are allowed.';
