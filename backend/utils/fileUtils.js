const fs = require('fs').promises;
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const CONVERTED_DIR = path.join(__dirname, '../converted');

// Ensure directories exist
async function ensureDirectories() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(CONVERTED_DIR, { recursive: true });
}

// Clean up old files
async function cleanupOldFiles() {
  const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  try {
    const [uploadedFiles, convertedFiles] = await Promise.all([
      fs.readdir(UPLOAD_DIR),
      fs.readdir(CONVERTED_DIR)
    ]);

    const now = Date.now();

    // Clean up uploaded files
    for (const file of uploadedFiles) {
      const filePath = path.join(UPLOAD_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > ONE_DAY) {
        await fs.unlink(filePath);
      }
    }

    // Clean up converted files (for guest users)
    for (const file of convertedFiles) {
      const filePath = path.join(CONVERTED_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > ONE_DAY) {
        await fs.unlink(filePath);
      }
    }
  } catch (error) {
    console.error('Error cleaning up files:', error);
  }
}

module.exports = {
  ensureDirectories,
  cleanupOldFiles,
  UPLOAD_DIR,
  CONVERTED_DIR
};