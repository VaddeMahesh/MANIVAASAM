const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Resident = require('../models/Resident');
const Flat = require('../models/Flat');
const Apartment = require('../models/Apartment');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { sendEmail } = require('../services/emailService');
const { generateToken } = require('../middleware/auth');

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new AppError(errors.array().map(e=>e.msg).join(', '), 400));

    const { apartmentName, address, numberOfFlats, numberOfFloors, email, password, firstName, lastName, phoneNumber } = req.body;

    // create apartment without adminId
    const apartment = await Apartment.create({ apartmentName, address, numberOfFlats, numberOfFloors });

    // create admin linked to apartment
    const admin = await Admin.create({ email, password, firstName, lastName, phoneNumber, apartmentId: apartment._id });

    // link apartment to admin
    apartment.adminId = admin._id;
    await apartment.save();

    const token = generateToken(admin);

    res.status(201).json({ success: true, data: { admin: { id: admin._id, email: admin.email }, token } });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return next(new AppError('Please provide email and password', 400));

    const admin = await Admin.findOne({ email }).select('+password').populate('apartmentId');
    if (!admin || !(await admin.comparePassword(password))) return next(new AppError('Incorrect email or password', 401));

    const token = generateToken(admin);

    admin.lastLogin = Date.now();
    await admin.resetLoginAttempts();
    await admin.save();

    const apartment = admin.apartmentId;
    res.json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          apartmentId: apartment?._id,
          apartmentName: apartment?.apartmentName,
          apartment,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new AppError('Email is required', 400));

    const admin = await Admin.findOne({ email });
    if (!admin) return next(new AppError('No admin found with that email', 404));

    const token = crypto.randomBytes(32).toString('hex');
    admin.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
    admin.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await admin.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;

    await sendEmail({ to: admin.email, subject: 'Password reset', text: `Reset your password: ${resetUrl}` });

    res.json({ success: true, message: 'Reset token sent to email' });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!token) return next(new AppError('Token missing', 400));

    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const admin = await Admin.findOne({ passwordResetToken: hashed, passwordResetExpires: { $gt: Date.now() } });
    if (!admin) return next(new AppError('Token is invalid or has expired', 400));

    admin.password = password;
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    await admin.save();

    const jwt = generateToken(admin);
    res.json({ success: true, data: { token: jwt } });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const admin = req.admin;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return next(new AppError('Old and new passwords are required', 400));

    const current = await Admin.findById(admin._id).select('+password');
    if (!(await current.comparePassword(oldPassword))) return next(new AppError('Old password is incorrect', 401));

    current.password = newPassword;
    current.passwordChangedAt = Date.now();
    await current.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// Resident (Flat Owner / Tenant) Signup
exports.residentSignup = async (req, res, next) => {
  try {
    const { email, password, name, phoneNumber, flatNumber, role = 'owner', apartmentId } = req.body;
    if (!email || !password || !name || !flatNumber) {
      return next(new AppError('Please provide email, password, name, and flat number', 400));
    }

    const normEmail = email.toLowerCase().trim();
    const normFlat = flatNumber.toUpperCase().trim();

    // Check if resident with email already exists
    const existingResident = await Resident.findOne({ email: normEmail });
    if (existingResident) {
      return next(new AppError('An account with this email already exists. Please login.', 400));
    }

    // Resolve apartment
    let aptId = apartmentId;
    if (!aptId) {
      const defaultApt = await Apartment.findOne();
      if (!defaultApt) return next(new AppError('Apartment not found in system', 404));
      aptId = defaultApt._id;
    }

    // Find flat by flatNumber
    let flat = await Flat.findOne({
      apartmentId: aptId,
      flatNumber: { $regex: new RegExp(`^${normFlat.replace(/[-]/g, '[-]?')}$`, 'i') },
    });

    if (!flat) {
      // Auto-create flat
      flat = await Flat.create({
        flatNumber: normFlat,
        apartmentId: aptId,
        floorNumber: parseInt(normFlat.replace(/\D/g, '')?.[0] || '1', 10) || 1,
        status: 'occupied',
        occupationType: role === 'tenant' ? 'rented' : 'owner',
        owner: {
          name,
          email: normEmail,
          phoneNumber: phoneNumber || '9999999999',
        },
      });
    }

    const resident = await Resident.create({
      email: normEmail,
      password,
      name,
      phoneNumber,
      flatNumber: flat.flatNumber,
      flatId: flat._id,
      apartmentId: flat.apartmentId,
      role: role === 'tenant' ? 'tenant' : 'owner',
    });

    const token = generateToken(resident, { role: resident.role });

    res.status(201).json({
      success: true,
      data: {
        resident: {
          id: resident._id,
          name: resident.name,
          email: resident.email,
          flatNumber: resident.flatNumber,
          role: resident.role,
          flatId: flat._id,
          apartmentId: flat.apartmentId,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Resident (Flat Owner / Tenant) Login
exports.residentLogin = async (req, res, next) => {
  try {
    const { emailOrFlat, password } = req.body;
    if (!emailOrFlat || !password) {
      return next(new AppError('Please provide email or flat number and password', 400));
    }

    const input = emailOrFlat.trim();
    const isEmail = input.includes('@');

    let query = {};
    if (isEmail) {
      query.email = input.toLowerCase();
    } else {
      query.flatNumber = { $regex: new RegExp(`^${input.replace(/[-]/g, '[-]?')}$`, 'i') };
    }

    let resident = await Resident.findOne(query).select('+password').populate('apartmentId');

    // If resident doesn't exist yet, check if Flat exists in DB so we can auto-provision seamlessly
    if (!resident) {
      const flatQuery = isEmail
        ? { 'owner.email': input.toLowerCase() }
        : { flatNumber: { $regex: new RegExp(`^${input.replace(/[-]/g, '[-]?')}$`, 'i') } };

      const flat = await Flat.findOne(flatQuery);
      if (flat) {
        const resEmail = isEmail ? input.toLowerCase() : (flat.owner?.email || `${flat.flatNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@apartment.com`);
        const resName = flat.owner?.name || `Resident ${flat.flatNumber}`;

        resident = await Resident.create({
          email: resEmail,
          password: password,
          name: resName,
          phoneNumber: flat.owner?.phoneNumber || '9999999999',
          flatNumber: flat.flatNumber,
          flatId: flat._id,
          apartmentId: flat.apartmentId,
          role: flat.occupationType === 'rented' ? 'tenant' : 'owner',
        });
        resident = await Resident.findById(resident._id).select('+password').populate('apartmentId');
      }
    }

    if (!resident || !(await resident.comparePassword(password))) {
      return next(new AppError('Incorrect flat number/email or password', 401));
    }

    resident.lastLogin = Date.now();
    await resident.save({ validateBeforeSave: false });

    const token = generateToken(resident, { role: resident.role });

    res.json({
      success: true,
      data: {
        resident: {
          id: resident._id,
          name: resident.name,
          email: resident.email,
          phoneNumber: resident.phoneNumber,
          flatNumber: resident.flatNumber,
          role: resident.role,
          flatId: resident.flatId,
          apartmentId: resident.apartmentId?._id || resident.apartmentId,
          apartmentName: resident.apartmentId?.apartmentName || 'Apartment Society',
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Current authenticated user (Admin or Resident)
exports.getMe = async (req, res, next) => {
  try {
    if (req.user?.role === 'admin') {
      const admin = await Admin.findById(req.user.id).populate('apartmentId');
      return res.json({
        success: true,
        data: {
          role: 'admin',
          admin: {
            id: admin._id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            apartmentId: admin.apartmentId?._id,
            apartmentName: admin.apartmentId?.apartmentName,
          },
        },
      });
    } else if (req.resident) {
      return res.json({
        success: true,
        data: {
          role: req.resident.role || 'resident',
          resident: {
            id: req.resident._id,
            name: req.resident.name,
            email: req.resident.email,
            flatNumber: req.resident.flatNumber,
            role: req.resident.role,
            flatId: req.resident.flatId,
            apartmentId: req.resident.apartmentId,
          },
        },
      });
    }
    res.status(401).json({ success: false, message: 'Not authenticated' });
  } catch (error) {
    next(error);
  }
};
