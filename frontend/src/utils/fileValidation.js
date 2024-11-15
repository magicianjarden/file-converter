const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_FORMATS = {
  audio: ['mp3', 'wav', 'ogg', 'm4a'],
  video: ['mp4', 'avi', 'mov', 'wmv'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  text: ['txt', 'doc', 'docx', 'pdf', 'rtf']
};

export const validateFile = (file, type) => {
  if (!file) {
    throw new Error('No file selected');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 100MB limit');
  }

  const extension = file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_FORMATS[type].includes(extension)) {
    throw new Error(`Invalid file format. Allowed formats: ${ALLOWED_FORMATS[type].join(', ')}`);
  }

  return true;
};

export const getFileType = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  for (const [type, formats] of Object.entries(ALLOWED_FORMATS)) {
    if (formats.includes(extension)) {
      return type;
    }
  }
  return null;
};