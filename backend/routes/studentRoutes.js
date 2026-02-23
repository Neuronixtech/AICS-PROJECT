const express = require('express');
const router = express.Router();
const {
  addStudent,
  getAllStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  addPayment,
  uploadDocument
} = require('../controllers/studentController');
const { protect, adminOrStaff, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(protect);

router.route('/')
  .post(adminOrStaff, addStudent)
  .get(adminOrStaff, getAllStudents);

router.route('/:id')
  .get(adminOrStaff, getStudent)
  .put(adminOrStaff, updateStudent)
  .delete(adminOnly, deleteStudent);

router.post('/:id/payment', adminOrStaff, addPayment);
router.post('/:id/upload-document', adminOrStaff, upload.single('document'), uploadDocument);

module.exports = router;
