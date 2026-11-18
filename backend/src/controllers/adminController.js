const Admin = require('../models/Admin');
const Apartment = require('../models/Apartment');
const AppError = require('../utils/AppError');

exports.getProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id).populate('apartmentId');
    if (!admin) return next(new AppError('Admin not found', 404));
    // Older societies may not have a code yet: assign one now so the admin can share it
    if (admin.apartmentId && !admin.apartmentId.societyCode) {
      admin.apartmentId.societyCode = await Apartment.ensureSocietyCode(admin.apartmentId);
    }
    res.json({ success: true, data: admin });
  } catch (error) { next(error); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findByIdAndUpdate(req.admin._id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: admin });
  } catch (error) { next(error); }
};

exports.addSurplus = async (req, res, next) => {
  try {
    const { apartmentId, amount, memo } = req.body;
    if (!apartmentId || !amount) return next(new AppError('Apartment ID and amount are required', 400));

    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) return next(new AppError('Apartment not found', 404));

    apartment.metadata = apartment.metadata || {};
    apartment.metadata.surplusFunds = apartment.metadata.surplusFunds || [];
    apartment.metadata.surplusFunds.push({ amount, memo, addedBy: req.admin._id });
    await apartment.save();

    res.json({ success: true, data: apartment.metadata.surplusFunds });
  } catch (error) { next(error); }
};
