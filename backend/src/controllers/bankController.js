const BankDetails = require('../models/BankDetails');
const Apartment = require('../models/Apartment');
const AppError = require('../utils/AppError');

exports.getBank = async (req, res, next) => {
  try {
    const bank = await BankDetails.findOne({ apartmentId: req.query.apartmentId });
    if (!bank) return res.json({ success: true, data: null, message: 'No bank details' });
    res.json({ success: true, data: bank });
  } catch (error) { next(error); }
};

exports.createOrUpdate = async (req, res, next) => {
  try {
    const { apartmentId } = req.body;
    if (!apartmentId) return next(new AppError('Apartment ID required', 400));
    const bank = await BankDetails.findOneAndUpdate({ apartmentId }, req.body, { upsert: true, new: true, runValidators: true });
    res.json({ success: true, data: bank });
  } catch (error) { next(error); }
};

exports.deleteBank = async (req, res, next) => {
  try {
    const bank = await BankDetails.findByIdAndDelete(req.params.id);
    if (!bank) return next(new AppError('Bank details not found', 404));
    res.json({ success: true, message: 'Bank details removed' });
  } catch (error) { next(error); }
};
