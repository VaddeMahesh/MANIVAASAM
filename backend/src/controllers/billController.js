const { validationResult } = require('express-validator');
const Bill = require('../models/Bill');
const Flat = require('../models/Flat');
const AppError = require('../utils/AppError');
const { toFlatKey } = require('../utils/flatKey');

exports.listBills = async (req, res, next) => {
  try {
    const { billingMonth, status, flatId } = req.query;
    const apartmentId = req.query.apartmentId || req.admin.apartmentId;
    const filter = {};
    if (apartmentId) filter.apartmentId = apartmentId;
    if (billingMonth) filter.billingMonth = billingMonth;
    if (status) filter.status = status;
    if (flatId) filter.flatId = flatId;

    const bills = await Bill.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: bills });
  } catch (error) { next(error); }
};

exports.getBill = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return next(new AppError('Bill not found', 404));
    res.json({ success: true, data: bill });
  } catch (error) { next(error); }
};

exports.createBill = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));

    const apartmentId = req.body.apartmentId || req.admin.apartmentId;
    const payload = { ...req.body, apartmentId, generatedBy: req.admin._id };
    const bill = await Bill.create(payload);
    res.status(201).json({ success: true, data: bill });
  } catch (error) { next(error); }
};

exports.updateBill = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return next(new AppError('Bill not found', 404));

    Object.assign(bill, req.body);

    // Auto-derive status from amounts
    if (req.body.paidAmount !== undefined || req.body.amount !== undefined) {
      const paid = bill.paidAmount;
      const total = bill.amount + bill.penalty;
      if (paid >= total) bill.status = 'paid';
      else if (paid > 0) bill.status = 'partial';
    }

    await bill.save();

    // Recalculate Flat dues so resident sees 0 or remaining balance immediately
    if (bill.flatId) {
      const allFlatBills = await Bill.find({ flatId: bill.flatId });
      const pendingSum = allFlatBills.reduce((sum, b) => {
        if (b.status === 'paid') return sum;
        const bal = Math.max(0, (b.amount || 0) + (b.penalty || 0) - (b.paidAmount || 0));
        return sum + bal;
      }, 0);

      const flat = await Flat.findById(bill.flatId);
      if (flat) {
        if (!flat.dues) flat.dues = {};
        flat.dues.pendingDueAmount = pendingSum;
        flat.dues.totalDueAmount = pendingSum;
        await flat.save();
      }
    }

    res.json({ success: true, data: bill });
  } catch (error) { next(error); }
};

exports.deleteBill = async (req, res, next) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) return next(new AppError('Bill not found', 404));
    res.json({ success: true, message: 'Bill deleted' });
  } catch (error) { next(error); }
};

exports.generateBills = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));

    const apartmentId = req.body.apartmentId || req.admin.apartmentId;
    const { billingMonth, amount, dueDayOfMonth } = req.body;

    // Check for existing bills for this month
    const existing = await Bill.find({ apartmentId, billingMonth });
    const existingFlatIds = new Set(existing.map(b => String(b.flatId)));

    // Get all occupied flats for this apartment
    const flats = await Flat.find({ apartmentId, status: 'occupied' });
    if (!flats.length) return next(new AppError('No occupied flats found', 400));

    const [year, month] = billingMonth.split('-').map(Number);
    const dueDay = Number(dueDayOfMonth) || 10;
    const dueDate = new Date(year, month - 1, dueDay);

    const newBills = [];
    for (const flat of flats) {
      if (existingFlatIds.has(String(flat._id))) continue;

      const ownerName = flat.occupationType === 'rented'
        ? flat.renter?.name || flat.owner?.name || 'Unknown'
        : flat.owner?.name || 'Unknown';

      newBills.push({
        apartmentId,
        flatId: flat._id,
        flatNumber: flat.flatNumber,
        ownerName,
        billingMonth,
        amount: Number(amount),
        dueDate,
        status: 'pending',
        generatedBy: req.admin._id
      });
    }

    const created = newBills.length > 0 ? await Bill.insertMany(newBills) : [];
    const skipped = flats.length - newBills.length;

    res.status(201).json({
      success: true,
      data: created,
      message: `Generated ${created.length} bills${skipped > 0 ? `, skipped ${skipped} (already exist)` : ''}`
    });
  } catch (error) { next(error); }
};

exports.bulkImportBills = async (req, res, next) => {
  try {
    const apartmentId = req.body.apartmentId || req.admin.apartmentId;
    const { billingMonth, bills, dueDayOfMonth } = req.body;

    if (!billingMonth || !Array.isArray(bills) || bills.length === 0) {
      return next(new AppError('billingMonth and bills array are required', 400));
    }

    const [year, month] = billingMonth.split('-').map(Number);
    const dueDay = Number(dueDayOfMonth) || 10;
    const dueDate = new Date(year, month - 1, dueDay);

    // Fetch existing flats for this apartment
    const existingFlats = await Flat.find({ apartmentId });
    const flatMap = new Map();
    // Key by flatKey so "A101" in the sheet matches an existing "A-101" instead of creating a duplicate
    existingFlats.forEach((f) => {
      flatMap.set(toFlatKey(f.flatNumber), f);
    });

    const updatedBills = [];
    const createdFlats = [];

    for (const item of bills) {
      const rawFlat = (item.flatNumber || item.flatNo || '').toString().trim();
      const flatNum = rawFlat.toUpperCase();
      if (!flatNum || flatNum === 'WATCHMEN' || flatNum === 'WATCH MEN' || flatNum.startsWith('TOTAL')) {
        continue;
      }

      let flat = flatMap.get(toFlatKey(flatNum));
      if (!flat) {
        // Derive floor from flat number: G1 -> 1, A-101 -> 1, A-201 -> 2, etc.
        let floor = 1;
        const match = flatNum.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          floor = num >= 100 ? Math.floor(num / 100) : 1;
        }

        flat = await Flat.create({
          apartmentId,
          flatNumber: rawFlat,
          floorNumber: floor,
          owner: {
            name: item.ownerName || `Resident ${rawFlat}`,
            email: `flat_${rawFlat.toLowerCase().replace(/[^a-z0-9]/g, '')}@apartment.com`,
            phoneNumber: '9999999999',
          },
          occupationType: 'owner',
          status: 'occupied',
          dues: {
            maintenanceFeePerMonth: Number(item.amount || item.totalAmount || 0),
            totalDueAmount: Number(item.amount || item.totalAmount || 0),
            paidAmount: 0,
            pendingDueAmount: Number(item.amount || item.totalAmount || 0),
          },
        });
        flatMap.set(toFlatKey(flatNum), flat);
        createdFlats.push(flat);
      }

      const billAmount = Math.round(Number(item.amount || item.totalAmount || 0));
      const ownerName = flat.occupationType === 'rented'
        ? flat.renter?.name || flat.owner?.name || `Resident ${flat.flatNumber}`
        : flat.owner?.name || `Owner ${flat.flatNumber}`;

      // Build remarks / breakdown summary
      const remarksParts = [];
      if (item.waterUsed) remarksParts.push(`Water: ${item.waterUsed}L`);
      if (item.manjeeraTankerAmt) remarksParts.push(`Tanker: ₹${item.manjeeraTankerAmt}`);
      if (item.pvtTankerAmt) remarksParts.push(`Pvt Tanker: ₹${item.pvtTankerAmt}`);
      if (item.hmwssbBill) remarksParts.push(`HMWSSB: ₹${item.hmwssbBill}`);
      if (item.commonMaint) remarksParts.push(`Common Maint: ₹${item.commonMaint}`);
      const remarks = item.remarks || remarksParts.join(' | ') || undefined;

      const breakdownData = {
        manjeeraWaterAmt: Number(item.manjeeraTankerAmt || 0),
        pvtTankerAmt: Number(item.pvtTankerAmt || 0),
        hmwssbBill: Number(item.hmwssbBill || 0),
        commonMaintAmt: Number(item.commonMaint || 0),
        waterUsedLiters: Number(item.waterUsed || 0),
      };

      // Upsert bill for this flat and month
      let bill = await Bill.findOne({ apartmentId, flatId: flat._id, billingMonth });
      if (bill) {
        bill.amount = billAmount;
        if (remarks) bill.remarks = remarks;
        if (item.waterUsed !== undefined) bill.waterUsed = Number(item.waterUsed);
        if (item.meterStart !== undefined) bill.meterStart = Number(item.meterStart);
        if (item.meterEnd !== undefined) bill.meterEnd = Number(item.meterEnd);
        bill.breakdown = breakdownData;

        // Recalculate status
        const total = bill.amount + (bill.penalty || 0);
        if (bill.paidAmount >= total && total > 0) bill.status = 'paid';
        else if (bill.paidAmount > 0) bill.status = 'partial';
        else bill.status = 'pending';

        await bill.save();
      } else {
        bill = await Bill.create({
          apartmentId,
          flatId: flat._id,
          flatNumber: flat.flatNumber,
          ownerName,
          billingMonth,
          amount: billAmount,
          dueDate,
          status: 'pending',
          remarks,
          waterUsed: Number(item.waterUsed || 0),
          meterStart: Number(item.meterStart || 0),
          meterEnd: Number(item.meterEnd || 0),
          breakdown: breakdownData,
          generatedBy: req.admin._id,
        });
      }

      // Update flat's maintenance fee and pending dues
      if (flat.dues) {
        flat.dues.maintenanceFeePerMonth = billAmount;
        const flatBills = await Bill.find({ flatId: flat._id });
        const totalBilled = flatBills.reduce((s, b) => s + (b.amount || 0) + (b.penalty || 0), 0);
        const totalPaid = flatBills.reduce((s, b) => s + (b.paidAmount || 0), 0);
        flat.dues.totalDueAmount = totalBilled;
        flat.dues.paidAmount = totalPaid;
        flat.dues.pendingDueAmount = Math.max(0, totalBilled - totalPaid);
        await flat.save();
      }

      updatedBills.push(bill);
    }

    res.status(200).json({
      success: true,
      message: `Successfully updated ${updatedBills.length} flat bills for ${billingMonth}${createdFlats.length > 0 ? ` (created ${createdFlats.length} new flats)` : ''}`,
      data: {
        updatedCount: updatedBills.length,
        createdFlatsCount: createdFlats.length,
        bills: updatedBills,
      },
    });
  } catch (error) { next(error); }
};
