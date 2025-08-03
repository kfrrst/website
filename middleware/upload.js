import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';

/**
 * File Upload Middleware for Kendrick Forrest Client Portal
 * Handles file uploads with validation, storage, and security measures
 */

// File type configurations
const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': { extension: '.jpg', category: 'image' },
  'image/jpg': { extension: '.jpg', category: 'image' },
  'image/png': { extension: '.png', category: 'image' },
  'image/gif': { extension: '.gif', category: 'image' },
  'image/svg+xml': { extension: '.svg', category: 'image' },
  'image/webp': { extension: '.webp', category: 'image' },
  
  // Documents
  'application/pdf': { extension: '.pdf', category: 'document' },
  'application/msword': { extension: '.doc', category: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extension: '.docx', category: 'document' },
  'application/vnd.ms-excel': { extension: '.xls', category: 'document' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { extension: '.xlsx', category: 'document' },
  'application/vnd.ms-powerpoint': { extension: '.ppt', category: 'document' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { extension: '.pptx', category: 'document' },
  'text/plain': { extension: '.txt', category: 'document' },
  'text/csv': { extension: '.csv', category: 'document' },
  'application/rtf': { extension: '.rtf', category: 'document' },
  
  // Archives
  'application/zip': { extension: '.zip', category: 'archive' },
  'application/x-rar-compressed': { extension: '.rar', category: 'archive' },
  'application/x-7z-compressed': { extension: '.7z', category: 'archive' }
};

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const mimeInfo = ALLOWED_MIME_TYPES[file.mimetype];
      if (!mimeInfo) {
        return cb(new Error('File type not allowed'), null);
      }
      
      // Determine subfolder based on file category
      let subfolder;
      switch (mimeInfo.category) {
        case 'image':
          subfolder = 'images';
          break;
        case 'document':
          subfolder = 'documents';
          break;
        case 'archive':
          subfolder = 'documents'; // Store archives with documents
          break;
        default:
          subfolder = 'documents';
      }
      
      const uploadPath = path.join(process.cwd(), 'uploads', subfolder);
      
      // Ensure directory exists
      await fs.ensureDir(uploadPath);
      
      cb(null, uploadPath);
    } catch (error) {
      cb(error, null);
    }
  },
  
  filename: (req, file, cb) => {
    try {
      // Generate unique filename with UUID
      const fileId = uuidv4();
      const mimeInfo = ALLOWED_MIME_TYPES[file.mimetype];
      const extension = mimeInfo ? mimeInfo.extension : path.extname(file.originalname);
      const filename = `${fileId}${extension}`;
      
      cb(null, filename);
    } catch (error) {
      cb(error, null);
    }
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check if mime type is allowed
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    return cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`), false);
  }
  
  // Check file name length
  if (file.originalname.length > 255) {
    return cb(new Error('File name is too long (maximum 255 characters)'), false);
  }
  
  // Basic security check for file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const expectedExt = ALLOWED_MIME_TYPES[file.mimetype].extension;
  
  // Allow files without extension or with matching extension
  if (ext && ext !== expectedExt) {
    return cb(new Error(`File extension ${ext} does not match mime type ${file.mimetype}`), false);
  }
  
  cb(null, true);
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // Maximum 10 files per request
    fields: 10, // Maximum 10 non-file fields
    fieldNameSize: 100, // Maximum field name size
    fieldSize: 1024 * 1024 // Maximum field value size (1MB)
  }
});

// Middleware for single file upload
const uploadSingle = (fieldName = 'file') => {
  return (req, res, next) => {
    const singleUpload = upload.single(fieldName);
    
    singleUpload(req, res, (err) => {
      if (err) {
        return handleUploadError(err, res);
      }
      next();
    });
  };
};

// Middleware for multiple file upload
const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  return (req, res, next) => {
    const multipleUpload = upload.array(fieldName, maxCount);
    
    multipleUpload(req, res, (err) => {
      if (err) {
        return handleUploadError(err, res);
      }
      next();
    });
  };
};

// Middleware for mixed form data (multiple fields with files)
const uploadFields = (fields) => {
  return (req, res, next) => {
    const fieldsUpload = upload.fields(fields);
    
    fieldsUpload(req, res, (err) => {
      if (err) {
        return handleUploadError(err, res);
      }
      next();
    });
  };
};

// Error handling for uploads
const handleUploadError = (err, res) => {
  console.error('File upload error:', err);
  
  let statusCode = 400;
  let message = 'File upload failed';
  
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File size too large. Maximum size is ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum 10 files per upload';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields in request';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field in request';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in multipart request';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
      default:
        message = `Upload error: ${err.message}`;
    }
  } else {
    message = err.message || 'Unknown upload error';
  }
  
  return res.status(statusCode).json({
    error: message,
    code: err.code || 'UPLOAD_ERROR'
  });
};

// Helper function to get file category from mime type
const getFileCategory = (mimeType) => {
  const mimeInfo = ALLOWED_MIME_TYPES[mimeType];
  return mimeInfo ? mimeInfo.category : 'other';
};

// Helper function to validate file type
const isAllowedFileType = (mimeType) => {
  return ALLOWED_MIME_TYPES.hasOwnProperty(mimeType);
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to clean up uploaded files (for rollback scenarios)
const cleanupFiles = async (files) => {
  if (!files || !Array.isArray(files)) return;
  
  for (const file of files) {
    try {
      await fs.remove(file.path);
    } catch (error) {
      console.error('Error cleaning up file:', file.path, error);
    }
  }
};

export {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  getFileCategory,
  isAllowedFileType,
  formatFileSize,
  cleanupFiles,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
};