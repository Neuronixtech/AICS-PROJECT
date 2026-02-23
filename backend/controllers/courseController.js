const Course = require('../models/Course');

// @desc    Add new course
// @route   POST /api/courses
// @access  Private/Admin
exports.addCourse = async (req, res) => {
  try {
    const { name, duration, description, defaultFees, fees, installmentOptions } = req.body;

    const courseExists = await Course.findOne({ name });
    if (courseExists) {
      return res.status(400).json({ message: 'Course already exists' });
    }

    // Use fees if provided, otherwise use defaultFees
    const courseFees = fees || defaultFees;

    const course = await Course.create({
      name,
      duration,
      description: description || '',
      fees: courseFees,
      defaultFees: courseFees,
      installmentOptions: installmentOptions || [1, 2, 3, 4, 6, 12]
    });

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private (Admin/Staff)
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true }).sort('name');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Private (Admin/Staff)
exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Admin
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const { name, duration, description, defaultFees, fees, installmentOptions } = req.body;

    // Use fees if provided, otherwise use defaultFees
    const courseFees = fees !== undefined ? fees : defaultFees;

    course.name = name || course.name;
    course.duration = duration || course.duration;
    course.description = description !== undefined ? description : course.description;
    
    if (courseFees !== undefined) {
      course.fees = courseFees;
      course.defaultFees = courseFees;
    }

    // Update installmentOptions if provided
    if (installmentOptions !== undefined) {
      course.installmentOptions = installmentOptions;
    }

    const updatedCourse = await course.save();
    res.json(updatedCourse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Soft delete
    course.isActive = false;
    await course.save();

    res.json({ message: 'Course removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
