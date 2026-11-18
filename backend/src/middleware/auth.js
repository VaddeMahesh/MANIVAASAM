const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Resident = require('../models/Resident');
const AppError = require('../utils/AppError');

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return next(new AppError('Not authenticated. Token missing', 401));

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    // First, check if token belongs to an Admin
    const admin = await Admin.findById(decoded.id).select('+password');
    if (admin) {
      req.admin = admin;
      req.user = {
        id: admin._id,
        role: 'admin',
        apartmentId: admin.apartmentId,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      };
      return next();
    }

    // Second, check if token belongs to a Resident (flat owner / tenant)
    const resident = await Resident.findById(decoded.id).select('+password').populate('flatId');
    if (resident) {
      req.resident = resident;
      req.user = {
        id: resident._id,
        role: resident.role || 'resident',
        userType: 'resident',
        flatId: resident.flatId?._id || resident.flatId,
        flatNumber: resident.flatNumber,
        apartmentId: resident.apartmentId,
        email: resident.email,
        name: resident.name,
      };
      // Compatibility fallback for controllers checking req.admin.apartmentId
      req.admin = {
        _id: resident._id,
        apartmentId: resident.apartmentId,
        role: 'resident',
      };
      return next();
    }

    return next(new AppError('The user belonging to this token no longer exists', 401));
  } catch (error) {
    next(error);
  }
};

// Must run after `protect`. Blocks resident (owner/tenant) tokens from admin-only routes.
exports.adminOnly = (req, res, next) => {
  if (req.resident) return next(new AppError('This action is only available to the society admin', 403));
  next();
};

exports.generateToken =(user, extra = {}) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: extra.role || user.role || 'admin',
    },
    process.env.JWT_SECRET || 'secret',
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    }
  );
};
