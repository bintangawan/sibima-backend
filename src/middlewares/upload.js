const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure base storage directory exists
const storageBaseDir = path.join(__dirname, '../../storage');
if (!fs.existsSync(storageBaseDir)) {
  fs.mkdirSync(storageBaseDir, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subDir = 'general';
    
    // Determine subdirectory based on field name or route
    if (file.fieldname === 'proposal' || req.baseUrl.includes('pengajuan')) {
      subDir = 'proposal';
    } else if (file.fieldname === 'logbook' || file.fieldname === 'dokumen' || req.baseUrl.includes('logbook')) {
      subDir = 'logbook';
    } else if (file.fieldname === 'surat' || req.baseUrl.includes('surat')) {
      subDir = 'surat';
    } else if (file.fieldname === 'avatar') {
      subDir = 'avatar';
    }

    const targetDir = path.join(storageBaseDir, subDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalName
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// File filter (PDF, DOC, DOCX, Images for avatars)
const fileFilter = (req, file, cb) => {
  const allowedDocTypes = ['.pdf', '.doc', '.docx'];
  const allowedImgTypes = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === 'avatar') {
    if (allowedImgTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format file foto profil tidak didukung! Gunakan .jpg, .jpeg, .png, atau .webp'), false);
    }
  } else {
    if (allowedDocTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format file dokumen tidak didukung! Gunakan ekstensi .pdf, .doc, atau .docx'), false);
    }
  }
};

// Max file size 10MB
const maxSize = (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024;

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxSize
  }
});

module.exports = upload;
