const User = require('../models/User');
const Student = require('../models/Student');
const Course = require('../models/Course');

// @desc    Add staff member
// @route   POST /api/admin/staff
// @access  Private/Admin
exports.addStaff = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create staff user
    const staff = await User.create({
      name,
      email,
      password,
      role: 'staff'
    });

    res.status(201).json({
      _id: staff._id,
      name: staff.name,
      email: staff.email,
      role: staff.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all staff members
// @route   GET /api/admin/staff
// @access  Private/Admin
exports.getAllStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }).select('-password');
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove staff member
// @route   DELETE /api/admin/staff/:id
// @access  Private/Admin
exports.removeStaff = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    if (staff.role !== 'staff') {
      return res.status(400).json({ message: 'User is not a staff member' });
    }

    // Permanently delete the staff member
    await staff.deleteOne();

    res.json({ message: 'Staff member removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get fees overview
// @route   GET /api/admin/fees-overview
// @access  Private/Admin
exports.getFeesOverview = async (req, res) => {
  try {
    const students = await Student.find({ status: 'enrolled' });

    const totalFees = students.reduce((sum, student) => sum + student.totalFees, 0);
    const totalPaid = students.reduce((sum, student) => sum + student.paidFees, 0);
    const totalPending = students.reduce((sum, student) => sum + student.pendingFees, 0);

    res.json({
      totalFees,
      totalCollected: totalPaid,
      totalPending: totalPending,
      totalStudents: students.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const totalEnquiries = await Student.countDocuments({ status: 'enquiry' });
    const totalEnrolled = await Student.countDocuments({ status: 'enrolled' });
    const totalStaff = await User.countDocuments({ role: 'staff', isActive: true });
    const totalCourses = await Course.countDocuments({ isActive: true });

    const students = await Student.find({ status: 'enrolled' });
    const totalFees = students.reduce((sum, student) => sum + student.totalFees, 0);
    const totalCollected = students.reduce((sum, student) => sum + student.paidFees, 0);
    const totalPending = students.reduce((sum, student) => sum + student.pendingFees, 0);

    res.json({
      enquiries: totalEnquiries,
      enrolled: totalEnrolled,
      staff: totalStaff,
      courses: totalCourses,
      fees: {
        total: totalFees,
        collected: totalCollected,
        pending: totalPending
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all enquiries
// @route   GET /api/admin/enquiries
// @access  Private/Admin
exports.getEnquiries = async (req, res) => {
  try {
    const enquiries = await Student.find({ status: 'enquiry' })
      .populate('course', 'name')
      .populate('addedBy', 'name')
      .sort('-createdAt');
    res.json(enquiries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all enrolled students
// @route   GET /api/admin/enrolled
// @access  Private/Admin
exports.getEnrolledStudents = async (req, res) => {
  try {
    const students = await Student.find({ status: 'enrolled' })
      .populate('course', 'name')
      .populate('addedBy', 'name')
      .sort('-enrollmentDate');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
