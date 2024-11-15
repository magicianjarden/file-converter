import { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Button,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import { 
  CloudUpload, 
  InsertDriveFile,
  ArrowForward 
} from '@mui/icons-material';
import { convertFile } from '../services/api';
import Notification from './Notification';

// File Categories and Conversions
const FILE_CATEGORIES = {
  document: {
    name: 'Documents',
    formats: {
      'pdf': 'PDF Document',
      'doc': 'Word Document',
      'docx': 'Word Document',
      'txt': 'Text File',
      'rtf': 'Rich Text Format',
      'odt': 'OpenDocument Text',
      'epub': 'E-Book Format',
      'mobi': 'Kindle Format',
      'pages': 'Apple Pages'
    }
  },
  spreadsheet: {
    name: 'Spreadsheets',
    formats: {
      'xlsx': 'Excel Workbook',
      'xls': 'Excel 97-2003',
      'csv': 'CSV File',
      'ods': 'OpenDocument Sheet',
      'numbers': 'Apple Numbers'
    }
  },
  presentation: {
    name: 'Presentations',
    formats: {
      'ppt': 'PowerPoint',
      'pptx': 'PowerPoint',
      'odp': 'OpenDocument',
      'key': 'Keynote'
    }
  },
  image: {
    name: 'Images',
    formats: {
      'jpg': 'JPEG Image',
      'jpeg': 'JPEG Image',
      'png': 'PNG Image',
      'gif': 'GIF Image',
      'webp': 'WebP Image',
      'svg': 'SVG Vector',
      'tiff': 'TIFF Image',
      'bmp': 'Bitmap Image',
      'ico': 'Icon File',
      'heic': 'HEIC Image'
    }
  },
  audio: {
    name: 'Audio',
    formats: {
      'mp3': 'MP3 Audio',
      'wav': 'WAV Audio',
      'ogg': 'OGG Audio',
      'm4a': 'AAC Audio',
      'flac': 'FLAC Audio',
      'aac': 'AAC Audio',
      'wma': 'Windows Media Audio'
    }
  },
  video: {
    name: 'Video',
    formats: {
      'mp4': 'MP4 Video',
      'avi': 'AVI Video',
      'mov': 'QuickTime Movie',
      'wmv': 'Windows Media Video',
      'mkv': 'Matroska Video',
      'flv': 'Flash Video',
      'webm': 'WebM Video'
    }
  },
  '3d': {
    name: '3D Models',
    formats: {
      'stl': 'Stereolithography',
      'obj': 'Wavefront OBJ',
      'fbx': 'Filmbox',
      'dae': 'COLLADA',
      'blend': 'Blender',
      'max': '3ds Max'
    }
  },
  archive: {
    name: 'Archives',
    formats: {
      'zip': 'ZIP Archive',
      'rar': 'RAR Archive',
      '7z': '7-Zip Archive',
      'tar': 'TAR Archive',
      'gz': 'GZIP Archive'
    }
  }
};

// Conversion paths - defines which formats can be converted to which others
const CONVERSION_PATHS = {
  // Document conversions
  'doc': ['pdf', 'docx', 'txt', 'rtf', 'odt'],
  'docx': ['pdf', 'doc', 'txt', 'rtf', 'odt'],
  'pdf': ['doc', 'docx', 'txt', 'epub', 'mobi'],
  'txt': ['pdf', 'doc', 'docx', 'rtf'],
  'epub': ['pdf', 'mobi', 'txt'],
  'mobi': ['pdf', 'epub', 'txt'],
  
  // Spreadsheet conversions
  'xlsx': ['csv', 'xls', 'pdf', 'ods'],
  'xls': ['xlsx', 'csv', 'pdf', 'ods'],
  'csv': ['xlsx', 'xls', 'pdf'],
  
  // Presentation conversions
  'ppt': ['pdf', 'pptx'],
  'pptx': ['pdf', 'ppt'],
  
  // Image conversions
  'jpg': ['png', 'webp', 'gif', 'tiff', 'pdf', 'svg'],
  'jpeg': ['png', 'webp', 'gif', 'tiff', 'pdf', 'svg'],
  'png': ['jpg', 'webp', 'gif', 'tiff', 'pdf', 'svg'],
  'gif': ['jpg', 'png', 'webp'],
  'webp': ['jpg', 'png', 'gif'],
  'svg': ['png', 'jpg', 'pdf'],
  'tiff': ['jpg', 'png', 'pdf'],
  'heic': ['jpg', 'png', 'pdf'],
  
  // Audio conversions
  'mp3': ['wav', 'ogg', 'm4a', 'flac'],
  'wav': ['mp3', 'ogg', 'm4a', 'flac'],
  'ogg': ['mp3', 'wav', 'm4a'],
  'flac': ['mp3', 'wav', 'ogg'],
  
  // Video conversions
  'mp4': ['avi', 'mov', 'webm', 'mkv'],
  'avi': ['mp4', 'mov', 'webm'],
  'mov': ['mp4', 'avi', 'webm'],
  'webm': ['mp4', 'avi'],
  
  // 3D model conversions
  'stl': ['obj', 'fbx', 'dae'],
  'obj': ['stl', 'fbx', 'dae'],
  'fbx': ['obj', 'stl', 'dae'],
  
  // Archive conversions
  'zip': ['7z', 'tar'],
  'rar': ['zip', '7z'],
  '7z': ['zip', 'tar']
};

// Helper function to get file category
const getFileCategory = (extension) => {
  for (const [category, data] of Object.entries(FILE_CATEGORIES)) {
    if (Object.keys(data.formats).includes(extension)) {
      return category;
    }
  }
  return null;
};

function FileConverter() {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [progress, setProgress] = useState(0);
  const [conversionStatus, setConversionStatus] = useState('');
  const ws = useRef(null);

  useEffect(() => {
    // Connect to WebSocket server
    ws.current = new WebSocket('ws://localhost:5001');

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.percentage);
      setConversionStatus(data.status);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const detectFileType = (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    return getFileCategory(extension);
  };

  const handleFileUpload = (event) => {
    try {
      const uploadedFile = event.target.files[0];
      if (!uploadedFile) return;

      const detectedType = detectFileType(uploadedFile);
      if (!detectedType) {
        showNotification('Unsupported file type', 'error');
        return;
      }

      setFile(uploadedFile);
      setFileType(detectedType);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const handleConvert = async (targetFormat) => {
    try {
      setLoading(true);
      setProgress(0);
      setConversionStatus('Starting...');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceType', fileType);
      formData.append('targetFormat', targetFormat);

      const response = await convertFile(formData);

      if (response.conversionId) {
        // Conversion started successfully
        showNotification('Conversion in progress...', 'info');
      }
    } catch (error) {
      console.error('Conversion error:', error);
      showNotification(
        `Conversion failed: ${error.message || 'Unknown error'}`,
        'error'
      );
      setProgress(0);
      setConversionStatus('');
    }
  };

  const showNotification = (message, severity) => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const getTargetFormats = () => {
    if (!file || !fileType) return [];
    const currentFormat = file.name.split('.').pop().toLowerCase();
    return CONVERSION_PATHS[currentFormat] || [];
  };

  const ConversionOptions = ({ formats }) => {
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Available Conversions
        </Typography>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
          gap: 2 
        }}>
          {formats.map((format) => (
            <Button
              key={format}
              variant="contained"
              onClick={() => handleConvert(format)}
              disabled={loading}
              sx={{
                py: 1.5,
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              }}
            >
              {FILE_CATEGORIES[getFileCategory(format)]?.formats[format] || format.toUpperCase()}
            </Button>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: 4, 
      py: 8,
      px: 2,
    }}>
      <Box sx={{ 
        textAlign: 'center', 
        mb: 4,
        width: '100%',
        maxWidth: 600 
      }}>
        <Typography 
          variant="h2" 
          component="h1" 
          sx={{ 
            mb: 2, 
            fontSize: { xs: '2rem', md: '3rem' }, 
            fontWeight: 800 
          }}
        >
          Convert Any File
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ 
            fontWeight: 400,
            px: 2
          }}
        >
          Fast, secure, and free file conversion. No registration required.
        </Typography>
      </Box>

      <Paper 
        elevation={0} 
        sx={{ 
          width: '100%',
          maxWidth: 600,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ p: 4 }}>
          {!file ? (
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'primary.main',
                borderRadius: 2,
                p: { xs: 3, sm: 4 },
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover': {
                  backgroundColor: 'primary.main',
                  '& .upload-text': { color: 'white' },
                  '& .upload-icon': { color: 'white' },
                },
              }}
              component="label"
            >
              <input
                type="file"
                hidden
                onChange={handleFileUpload}
                accept={Object.keys(FILE_CATEGORIES).map(ext => `.${ext}`).join(',')}
              />
              <CloudUpload 
                className="upload-icon" 
                sx={{ 
                  fontSize: { xs: 40, sm: 48 },
                  color: 'primary.main',
                  mb: 2,
                  transition: 'color 0.2s ease'
                }} 
              />
              <Typography 
                className="upload-text" 
                variant="h6" 
                color="primary" 
                sx={{ 
                  mb: 1,
                  transition: 'color 0.2s ease',
                  fontSize: { xs: '1.1rem', sm: '1.25rem' }
                }}
              >
                Drop your file here
              </Typography>
              <Typography 
                className="upload-text" 
                variant="body2" 
                color="text.secondary"
                sx={{ transition: 'color 0.2s ease' }}
              >
                or click to browse
              </Typography>
            </Box>
          ) : (
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <InsertDriveFile sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                </Box>
              </Box>

              <ConversionOptions formats={getTargetFormats()} />

              {loading && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {conversionStatus}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress} 
                    sx={{ 
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                      }
                    }}
                  />
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ mt: 1, textAlign: 'right' }}
                  >
                    {progress}%
                  </Typography>
                </Box>
              )}

              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  setFile(null);
                  setFileType('');
                }}
                sx={{ mt: 3 }}
                disabled={loading}
              >
                Choose Different File
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={closeNotification}
      />
    </Box>
  );
}

export default FileConverter;