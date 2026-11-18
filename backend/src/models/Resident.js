const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const residentSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  flatNumber: {
    type: String,
    required: [true, 'Flat number is required'],
    trim: true,
    uppercase: true
  },
  flatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flat',
    required: true
  },
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'tenant'],
    default: 'owner'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  lastLogin: Date
}, {
  timestamps: true
});

residentSchema.index({ apartmentId: 1, flatNumber: 1 });
// One account per email across the whole system (email login must resolve to exactly one resident)
residentSchema.index({ email: 1 }, { unique: true });

// Hash password before saving
residentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
residentSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Resident', residentSchema);
