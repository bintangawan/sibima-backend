const multer = require('multer');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ [Error Handler]:', err);

  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `Ukuran file melebihi batas maksimal (${process.env.MAX_FILE_SIZE_MB || 10} MB).`
      });
    }
    return res.status(400).json({
      success: false,
      message: `Kesalahan upload file: ${err.message}`
    });
  }

  // Handle custom upload format errors or general validation errors
  if (err.message && (err.message.includes('Format file') || err.message.includes('wajib diisi'))) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // Handle default 500 server error
  return res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = errorHandler;
