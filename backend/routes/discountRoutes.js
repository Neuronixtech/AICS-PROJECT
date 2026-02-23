const express = require('express');
const router = express.Router();
const { addDiscount, getAllDiscounts, updateDiscount, deleteDiscount, validateCoupon } = require('../controllers/discountController');
const { protect, adminOrStaff, adminOnly } = require('../middleware/auth');

router.use(protect);
router.post('/validate', adminOrStaff, validateCoupon);
router.route('/').post(adminOnly, addDiscount).get(adminOrStaff, getAllDiscounts);
router.route('/:id').put(adminOnly, updateDiscount).delete(adminOnly, deleteDiscount);

module.exports = router;
