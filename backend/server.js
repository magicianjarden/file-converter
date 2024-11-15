const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { ensureDirectories, cleanupOldFiles } = require('./utils/fileUtils');
const mongoose = require('mongoose');
const Conversion = require('./models/Conversion');
const util = require('util');
const unlinkAsync = util.promisify(fs.unlink);
const libreoffice = require('libreoffice-convert');
const archiver = require('archiver');
const unzipper = require('unzipper');
const epub = require('epub-gen');
const csv = require('csv-parser');
const ExcelJS = require('exceljs');
const meshlab = require('meshlab-js');
const EventEmitter = require('events');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// Middleware to identify user or guest
const identifyUser = (req, res, next) => {
  const userId = req.headers['user-id']; // From authenticated session
  const guestId = req.headers['guest-id']; // From localStorage
  
  if (!userId && !guestId) {
    return res.status(400).json({ error: 'No user identification provided' });
  }
  
  req.userId = userId;
  req.guestId = guestId;
  next();
};

// Set up WebSocket server
const wss = new WebSocket.Server({ port: 5001 });

// Handle WebSocket connections
wss.on('connection', (ws) => {
  ws.on('error', console.error);
});

// Progress tracker class
class ConversionProgress extends EventEmitter {
  constructor(totalSteps) {
    super();
    this.totalSteps = totalSteps;
    this.currentStep = 0;
  }

  update(step, details = '') {
    this.currentStep = step;
    const percentage = Math.round((step / this.totalSteps) * 100);
    this.emit('progress', { percentage, details });
  }
}

// Conversion functions
async function convertAudio(input, output, format) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .toFormat(format)
      .on('start', (commandLine) => {
        console.log('FFmpeg process started:', commandLine);
      })
      .on('progress', (progress) => {
        console.log('Processing: ' + progress.percent + '% done');
      })
      .on('end', () => {
        console.log('FFmpeg process completed');
        resolve();
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .save(output);
  });
}

async function convertVideo(input, output, format) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .toFormat(format)
      .on('end', resolve)
      .on('error', reject)
      .save(output);
  });
}

async function convertImage(input, output, format) {
  try {
    console.log('Starting image conversion:', { input, output, format });
    await sharp(input)
      .toFormat(format)
      .toFile(output);
    console.log('Image conversion completed');
  } catch (error) {
    console.error('Image conversion error:', error);
    throw error;
  }
}

async function convertText(input, output, format) {
  try {
    console.log('Starting text conversion:', { input, output, format });
    const content = await fsPromises.readFile(input, 'utf-8');
    
    if (format === 'pdf') {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      page.drawText(content);
      const pdfBytes = await pdfDoc.save();
      await fsPromises.writeFile(output, pdfBytes);
    } else {
      await fsPromises.copyFile(input, output);
    }
    console.log('Text conversion completed');
  } catch (error) {
    console.error('Text conversion error:', error);
    throw error;
  }
}

// Add this MIME type mapping at the top of your file
const MIME_TYPES = {
  // Audio
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'ogg': 'audio/ogg',
  'm4a': 'audio/mp4',
  
  // Video
  'mp4': 'video/mp4',
  'avi': 'video/x-msvideo',
  'mov': 'video/quicktime',
  'wmv': 'video/x-ms-wmv',
  
  // Image
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  
  // Text
  'txt': 'text/plain',
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'rtf': 'application/rtf'
};

// Routes
app.post('/api/convert', [identifyUser, upload.single('file')], async (req, res) => {
  const inputFile = req.file?.path;
  let outputFile = null;
  const conversionId = Date.now().toString();

  try {
    const { sourceType, targetFormat } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate output filename
    const originalName = path.basename(req.file.originalname, path.extname(req.file.originalname));
    outputFile = path.join('converted', `${conversionId}-${originalName}.${targetFormat}`);

    // Send initial response with conversionId
    res.json({ 
      conversionId,
      message: 'Conversion started',
      status: 'processing'
    });

    // Broadcast progress to connected clients
    const broadcastProgress = (progress) => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            conversionId,
            ...progress
          }));
        }
      });
    };

    // Perform conversion
    await convertFile(inputFile, outputFile, sourceType, targetFormat, broadcastProgress);

  } catch (error) {
    console.error('Conversion error:', error);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          conversionId,
          status: 'error',
          error: error.message
        }));
      }
    });
  }
});

app.get('/api/download/:conversionId', identifyUser, async (req, res) => {
  try {
    const conversion = await Conversion.findById(req.params.conversionId);
    
    if (!conversion) {
      return res.status(404).json({ error: 'Conversion not found' });
    }

    // Check if user has access to this conversion
    if (conversion.userId !== req.userId && conversion.guestId !== req.guestId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.join('converted', `${conversion._id}.${conversion.targetFormat}`);
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', identifyUser, async (req, res) => {
  try {
    const { userId, guestId } = req;
    
    const stats = await Conversion.aggregate([
      {
        $match: {
          $or: [
            { userId: userId },
            { guestId: guestId }
          ]
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          audio: {
            $sum: { $cond: [{ $eq: ['$sourceType', 'audio'] }, 1, 0] }
          },
          video: {
            $sum: { $cond: [{ $eq: ['$sourceType', 'video'] }, 1, 0] }
          },
          image: {
            $sum: { $cond: [{ $eq: ['$sourceType', 'image'] }, 1, 0] }
          },
          text: {
            $sum: { $cond: [{ $eq: ['$sourceType', 'text'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json(stats[0] || {
      total: 0,
      audio: 0,
      video: 0,
      image: 0,
      text: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/recent-conversions', identifyUser, async (req, res) => {
  try {
    const { userId, guestId } = req;
    
    const conversions = await Conversion.find({
      $or: [
        { userId: userId },
        { guestId: guestId }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(5);

    res.json(conversions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize server
async function initializeServer() {
  try {
    await ensureDirectories();
    
    // Clean up old files every 6 hours
    setInterval(cleanupOldFiles, 6 * 60 * 60 * 1000);
    
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Server initialization failed:', error);
    process.exit(1);
  }
}

mongoose.connect('mongodb://localhost:27017/file-converter', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

initializeServer();