const Discount = require('../models/Discount');

exports.addDiscount = async (req, res) => {
  try {
    const discount = await Discount.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(discount);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Coupon code already exists' });
    res.status(500).json({ message: error.message });
  }
};

exports.getAllDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find().populate('createdBy', 'name').sort('-createdAt');
    res.json(discounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateDiscount = async (req, res) => {
  try {
    const discount = await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!discount) return res.status(404).json({ message: 'Discount not found' });
    res.json(discount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteDiscount = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) return res.status(404).json({ message: 'Discount not found' });
    await discount.deleteOne();
    res.json({ message: 'Discount deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.validateCoupon = async (req, res) => {
  try {
    const { couponCode, courseFees } = req.body;
    const discount = await Discount.findOne({ couponCode: couponCode.toUpperCase() });
    if (!discount || !discount.isValid()) return res.status(404).json({ message: 'Invalid or expired coupon code' });
    const result = discount.applyDiscount(Number(courseFees));
    res.json({ valid: true, couponCode: discount.couponCode, description: discount.description, ...result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
