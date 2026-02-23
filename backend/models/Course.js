const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a course name'],
    trim: true,
    unique: true
  },
  duration: {
    type: Number, // Duration in months
    required: [true, 'Please add course duration in months'],
    min: 1
  },
  description: {
    type: String,
    default: ''
  },
  fees: {
    type: Number,
    required: [true, 'Please add course fees'],
    min: 0
  },
  // Keep defaultFees for backward compatibility
  defaultFees: {
    type: Number,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  enrolledCount: {
    type: Number,
    default: 0
  },
  installmentOptions: {
    type: [Number], // Array of allowed installment counts [1, 2, 3, 4, 6, 12]
    default: [1, 2, 3, 4, 6, 12]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Set defaultFees from fees if not provided
courseSchema.pre('save', function(next) {
  if (!this.defaultFees && this.fees) {
    this.defaultFees = this.fees;
  }
  next();
});

module.exports = mongoose.model('Course', courseSchema);
