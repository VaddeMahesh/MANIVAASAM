const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: { type: String, required: true },
  message: { type: String, required: true, trim: true },
  timestamp: { type: Date, default: Date.now }
});

const complaintSchema = new mongoose.Schema({
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    required: true
  },
  flatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flat',
    sparse: true
  },
  flatNumber: {
    type: String,
    required: true
  },
  residentName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['water', 'electricity', 'lift', 'parking', 'security', 'cleaning', 'noise', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  assignedTo: {
    type: String,
    sparse: true
  },
  resolvedAt: Date,
  resolution: String,
  comments: [commentSchema],
  images: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    sparse: true
  },
  // Who filed the complaint: society admin or a flat resident (owner/tenant)
  raisedBy: {
    type: String,
    enum: ['admin', 'resident'],
    default: 'admin'
  },
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    sparse: true
  },
  // Optional: the flat this complaint is raised against (e.g. noise, parking misuse)
  againstFlatNumber: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

complaintSchema.virtual('date').get(function () {
  return this.createdAt ? this.createdAt.toISOString().split('T')[0] : null;
});

complaintSchema.index({ apartmentId: 1, status: 1 });
complaintSchema.index({ apartmentId: 1, priority: 1 });
complaintSchema.index({ flatId: 1 });
complaintSchema.index({ apartmentId: 1, flatNumber: 1 });
complaintSchema.index({ apartmentId: 1, againstFlatNumber: 1 });
complaintSchema.index({ createdAt: -1 });

complaintSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Complaint', complaintSchema);
