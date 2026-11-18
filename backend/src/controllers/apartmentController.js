const Apartment = require('../models/Apartment');
const AppError = require('../utils/AppError');

exports.getApartment = async (req, res, next) => {
  try {
    const apartment = await Apartment.findById(req.params.id);
    if (!apartment) return next(new AppError('Apartment not found', 404));
    res.json({ success: true, data: apartment });
  } catch (error) { next(error); }
};

exports.listApartments = async (req, res, next) => {
  try {
    const apartments = await Apartment.find().sort({ registrationDate: -1 });
    res.json({ success: true, data: apartments });
  } catch (error) { next(error); }
};

exports.updateApartment = async (req, res, next) => {
  try {
    // Admins may only edit their own society
    if (String(req.admin.apartmentId) !== String(req.params.id)) {
      return next(new AppError('You can only update your own apartment', 403));
    }
    // societyCode is system-generated and shared with residents; changing it would break their logins
    const { societyCode, adminId, _id, ...updates } = req.body;
    const apartment = await Apartment.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!apartment) return next(new AppError('Apartment not found', 404));
    res.json({ success: true, data: apartment });
  } catch (error) { next(error); }
};
