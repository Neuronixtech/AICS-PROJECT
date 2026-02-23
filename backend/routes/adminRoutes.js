const express = require('express');
const router = express.Router();
const {
  addStaff,
  getAllStaff,
  removeStaff,
  getFeesOverview,
  getDashboardStats,
  getEnquiries,
  getEnrolledStudents
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect, adminOnly);

// Staff management
router.route('/staff')
  .post(addStaff)
  .get(getAllStaff);

router.delete('/staff/:id', removeStaff);

// Dashboard and overview
router.get('/dashboard', getDashboardStats);
router.get('/fees-overview', getFeesOverview);
router.get('/enquiries', getEnquiries);
router.get('/enrolled', getEnrolledStudents);

module.exports = router;
