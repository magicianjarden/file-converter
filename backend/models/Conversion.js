const mongoose = require('mongoose');

const conversionSchema = new mongoose.Schema({
  userId: { type: String }, // Can be null for guests
  guestId: { type: String }, // Used for guest sessions
  sourceType: {
    type: String,
    enum: ['audio', 'video', 'image', 'text'],
    required: true
  },
  targetFormat: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

module.exports = mongoose.model('Conversion', conversionSchema);