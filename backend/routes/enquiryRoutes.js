const express = require('express');
const router = express.Router();
const { addEnquiry, getAllEnquiries, updateEnquiry, deleteEnquiry } = require('../controllers/enquiryController');
const { protect, adminOrStaff, adminOnly } = require('../middleware/auth');

router.use(protect);
router.route('/').post(adminOrStaff, addEnquiry).get(adminOrStaff, getAllEnquiries);
router.route('/:id').put(adminOrStaff, updateEnquiry).delete(adminOnly, deleteEnquiry);

module.exports = router;
