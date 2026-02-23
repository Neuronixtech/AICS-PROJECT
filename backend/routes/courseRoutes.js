const express = require('express');
const router = express.Router();
const {
  addCourse,
  getAllCourses,
  getCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/courseController');
const { protect, adminOnly, adminOrStaff } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .post(adminOnly, addCourse)
  .get(adminOrStaff, getAllCourses);

router.route('/:id')
  .get(adminOrStaff, getCourse)
  .put(adminOnly, updateCourse)
  .delete(adminOnly, deleteCourse);

module.exports = router;
