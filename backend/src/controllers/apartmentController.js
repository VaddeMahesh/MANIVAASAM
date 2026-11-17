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
    const apartment = await Apartment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!apartment) return next(new AppError('Apartment not found', 404));
    res.json({ success: true, data: apartment });
  } catch (error) { next(error); }
};
