const CommitteeMember = require('../models/CommitteeMember');
const Flat = require('../models/Flat');
const AppError = require('../utils/AppError');

exports.listMembers = async (req, res, next) => {
  try {
    const { apartmentId } = req.query;
    const filter = {};
    if (apartmentId) filter.apartmentId = apartmentId;
    const members = await CommitteeMember.find(filter).sort({ joinedDate: -1 });
    res.json({ success: true, data: members });
  } catch (error) { next(error); }
};

exports.createMember = async (req, res, next) => {
  try {
    const member = await CommitteeMember.create(req.body);
    // mark flat as committee member
    await Flat.findByIdAndUpdate(member.flatId, { isCommitteeMember: true, committeeRole: member.role, membershipStartDate: member.joinedDate });
    res.status(201).json({ success: true, data: member });
  } catch (error) { next(error); }
};

exports.updateMember = async (req, res, next) => {
  try {
    const member = await CommitteeMember.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!member) return next(new AppError('Member not found', 404));
    res.json({ success: true, data: member });
  } catch (error) { next(error); }
};

exports.deleteMember = async (req, res, next) => {
  try {
    const member = await CommitteeMember.findByIdAndDelete(req.params.id);
    if (!member) return next(new AppError('Member not found', 404));
    // optionally unset flat committee flags
    await Flat.findByIdAndUpdate(member.flatId, { isCommitteeMember: false, committeeRole: null });
    res.json({ success: true, message: 'Member removed' });
  } catch (error) { next(error); }
};
