const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    sparse: true
  },
  type: {
    type: String,
    enum: ['payment', 'complaint', 'announcement', 'reminder', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  link: String,
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    sparse: true
  },
  relatedModel: {
    type: String,
    enum: ['Bill', 'Payment', 'Complaint', 'Flat'],
    sparse: true
  }
}, {
  timestamps: true
});

notificationSchema.virtual('timestamp').get(function () {
  return this.createdAt;
});

notificationSchema.virtual('read').get(function () {
  return this.isRead;
});

notificationSchema.index({ adminId: 1, isRead: 1 });
notificationSchema.index({ adminId: 1, createdAt: -1 });

notificationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Notification', notificationSchema);
