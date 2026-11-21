const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Resident = require('../models/Resident');
const Flat = require('../models/Flat');
const Apartment = require('../models/Apartment');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { sendEmail } = require('../services/emailService');
const { generateToken } = require('../middleware/auth');
const { normalizeFlatNumber, toFlatKey, normalizeSocietyCode } = require('../utils/flatKey');

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

    res.status(201).json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          email: admin.email,
          apartmentId: apartment._id,
          apartmentName: apartment.apartmentName,
          societyCode: apartment.societyCode,
        },
        token,
      },
    });
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
    // Older societies may not have a code yet: assign one now so the admin can share it
    if (apartment && !apartment.societyCode) {
      apartment.societyCode = await Apartment.ensureSocietyCode(apartment);
    }
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

// ==================== RESIDENT (FLAT OWNER / TENANT) AUTH ====================
// A flat is identified by Society Code + Flat Number (e.g. SRI4821 / A-101), because the same
// flat number exists in many societies. Email login stays available (emails are unique).

const residentPayload = (resident, apartment) => ({
  id: resident._id,
  name: resident.name,
  email: resident.email,
  phoneNumber: resident.phoneNumber,
  flatNumber: resident.flatNumber,
  role: resident.role,
  flatId: resident.flatId?._id || resident.flatId,
  apartmentId: apartment?._id || resident.apartmentId,
  apartmentName: apartment?.apartmentName || 'Apartment Society',
  societyCode: apartment?.societyCode,
});

const findSocietyByCode = (code) => {
  const normalized = normalizeSocietyCode(code);
  if (!normalized) return null;
  return Apartment.findOne({ societyCode: normalized }).select('_id apartmentName societyCode status');
};

// Public: confirm a society code before registering ("SRI4821" -> "sri"). Returns name only.
exports.lookupSociety = async (req, res, next) => {
  try {
    const apartment = await findSocietyByCode(req.params.code);
    if (!apartment) return next(new AppError('No society found with this code. Please check with your society admin.', 404));
    res.json({
      success: true,
      data: { apartmentName: apartment.apartmentName, societyCode: apartment.societyCode },
    });
  } catch (error) {
    next(error);
  }
};

exports.residentSignup = async (req, res, next) => {
  try {
    const { email, password, name, phoneNumber, flatNumber, role = 'owner', societyCode } = req.body;
    if (!societyCode) return next(new AppError('Please enter your Society Code (ask your society admin)', 400));
    if (!email || !password || !name || !flatNumber) {
      return next(new AppError('Please provide email, password, name, and flat number', 400));
    }

    const apartment = await findSocietyByCode(societyCode);
    if (!apartment) return next(new AppError('Invalid Society Code. Please check with your society admin.', 400));

    const normEmail = String(email).toLowerCase().trim();
    if (await Resident.exists({ email: normEmail })) {
      return next(new AppError('An account with this email already exists. Please login.', 400));
    }

    // The flat must already exist in this society (added by the admin or via bill import).
    // Flats are no longer auto-created here: a typo or wrong society used to create a bogus flat.
    const flat = await Flat.findOne({
      apartmentId: apartment._id,
      $or: [
        { flatKey: toFlatKey(flatNumber) },
        { flatNumber: normalizeFlatNumber(flatNumber) },
        { flatNumber: flatNumber }
      ]
    });
    if (!flat) {
      return next(new AppError(
        `Flat ${normalizeFlatNumber(flatNumber)} is not registered in ${apartment.apartmentName}. Please ask your society admin to add it.`,
        400
      ));
    }

    const resident = await Resident.create({
      email: normEmail,
      password,
      name,
      phoneNumber,
      flatNumber: flat.flatNumber,
      flatId: flat._id,
      apartmentId: apartment._id,
      role: role === 'tenant' ? 'tenant' : 'owner',
    });

    const token = generateToken(resident, { role: resident.role });

    res.status(201).json({
      success: true,
      data: { resident: residentPayload(resident, apartment), token },
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return next(new AppError('An account with this email already exists. Please login.', 400));
    }
    next(error);
  }
};

exports.residentLogin = async (req, res, next) => {
  try {
    const { emailOrFlat, password, societyCode } = req.body;
    if (!emailOrFlat || !password) {
      return next(new AppError('Please provide email or flat number and password', 400));
    }

    const input = String(emailOrFlat).trim();
    const isEmail = input.includes('@');
    const invalid = () => next(new AppError(
      'Incorrect login details. First time here? Use "Register Flat Resident Account".',
      401
    ));

    // NOTE: accounts are never auto-created on login (that let anyone claim an unregistered flat).
    let resident = null;

    if (isEmail) {
      resident = await Resident.findOne({ email: input.toLowerCase() }).select('+password').populate('apartmentId');
      if (!resident) {
        return next(new AppError('No resident account found with this email. First time here? Use "Register Flat Resident Account".', 401));
      }
      if (!(await resident.comparePassword(password))) {
        return next(new AppError('Incorrect password. Please note that passwords are case-sensitive.', 401));
      }
    } else {
      if (!societyCode) {
        return next(new AppError('Please enter your Society Code with your flat number, or sign in with your email.', 400));
      }
      const apartment = await findSocietyByCode(societyCode);
      if (!apartment) {
        return next(new AppError(`Society code "${societyCode}" was not found. Please verify the code with your society admin.`, 401));
      }

      const flat = await Flat.findOne({
        apartmentId: apartment._id,
        $or: [
          { flatKey: toFlatKey(input) },
          { flatNumber: normalizeFlatNumber(input) },
          { flatNumber: input }
        ]
      }).select('_id flatNumber');
      if (!flat) {
        return next(new AppError(`Flat "${input}" is not registered in ${apartment.apartmentName}. Please ask your society admin to add flat ${input} in the Flats directory.`, 401));
      }

      // Owner and tenant can share a flat; pick the account whose password matches.
      const candidates = await Resident.find({ flatId: flat._id }).select('+password').populate('apartmentId');
      if (candidates.length === 0) {
        return next(new AppError(
          `No resident account found for Flat ${flat.flatNumber}. First time here? Please click "Register Flat Resident Account" below to create your login password first.`,
          401
        ));
      }

      const matches = [];
      for (const r of candidates) {
        if (await r.comparePassword(password)) matches.push(r);
      }
      if (matches.length === 0) {
        return next(new AppError(`Incorrect password for Flat ${flat.flatNumber}. Please check your password (passwords are case-sensitive, e.g. "Password123" vs "password123").`, 401));
      }
      if (matches.length > 1) {
        return next(new AppError('More than one account on this flat uses this password. Please sign in with your email.', 409));
      }
      resident = matches[0];
    }

    resident.lastLogin = Date.now();
    await resident.save({ validateBeforeSave: false });

    const token = generateToken(resident, { role: resident.role });

    res.json({
      success: true,
      data: { resident: residentPayload(resident, resident.apartmentId), token },
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
      if (admin.apartmentId && !admin.apartmentId.societyCode) {
        admin.apartmentId.societyCode = await Apartment.ensureSocietyCode(admin.apartmentId);
      }
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
            societyCode: admin.apartmentId?.societyCode,
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
