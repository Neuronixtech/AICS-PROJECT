const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'Please add first name'],
    trim: true
  },
  fatherName: {
    type: String,
    required: [true, 'Please add father name'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Please add last name'],
    trim: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please add phone number'],
    match: [/^[0-9]{10}$/, 'Please add a valid 10-digit phone number']
  },
  address: String,
  qualification: String,
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  // Course Interest
  interestedCourse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Please select interested course']
  },
  
  // Follow-up
  expectedAdmissionDate: Date,
  followUpDate: Date,
  
  // Status
  status: {
    type: String,
    enum: ['new', 'contacted', 'converted', 'closed'],
    default: 'new'
  },
  
  // Notes
  notes: String,
  
  // Conversion
  convertedToStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  convertedAt: Date,
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for full name
enquirySchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.fatherName} ${this.lastName}`;
});

// Update timestamp on save
enquirySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Enquiry', enquirySchema);
