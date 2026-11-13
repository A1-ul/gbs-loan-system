const multer = require('multer');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { AppError } = require('../utils/errors');

const ensureUploadDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureUploadDir(config.upload.path);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir(config.upload.path);
    cb(null, config.upload.path);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type', 400, 'INVALID_FILE'), false);
  }
};

const dataFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExts = ['.csv', '.xlsx', '.xls', '.json'];
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid migration file type (expected .csv, .xlsx, .xls, or .json)', 400, 'INVALID_FILE'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter,
});

const uploadMigrationFile = multer({
  storage,
  limits: { fileSize: Math.max(config.upload.maxSize || 5 * 1024 * 1024, 25 * 1024 * 1024) },
  fileFilter: dataFileFilter,
});

module.exports = { upload, uploadMigrationFile };
