const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  // Coupon Details
  couponCode: {
    type: String,
    required: [true, 'Please add coupon code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add description']
  },
  
  // Discount
  percentage: {
    type: Number,
    required: [true, 'Please add discount percentage'],
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  
  // Validity
  validFrom: {
    type: Date,
    required: [true, 'Please add valid from date']
  },
  validTill: {
    type: Date,
    required: [true, 'Please add valid till date']
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Usage
  usageCount: {
    type: Number,
    default: 0
  },
  maxUsage: {
    type: Number,
    default: null // null = unlimited
  },
  
  // Applicable Courses
  applicableCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  applicableToAll: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Check if coupon is valid
discountSchema.methods.isValid = function() {
  const now = new Date();
  
  if (!this.isActive) return false;
  if (now < this.validFrom || now > this.validTill) return false;
  if (this.maxUsage && this.usageCount >= this.maxUsage) return false;
  
  return true;
};

// Apply discount to course fees
discountSchema.methods.applyDiscount = function(courseFees) {
  const discountAmount = (courseFees * this.percentage) / 100;
  const finalAmount = courseFees - discountAmount;
  
  return {
    originalFees: courseFees,
    discountPercentage: this.percentage,
    discountAmount: Math.round(discountAmount),
    finalFees: Math.round(finalAmount)
  };
};

// Increment usage count
discountSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  await this.save();
};

module.exports = mongoose.model('Discount', discountSchema);
