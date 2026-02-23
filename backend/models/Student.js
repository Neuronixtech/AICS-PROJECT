const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  // Split Name Fields (UPGRADED)
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
  
  // New Required Fields
  address: {
    type: String,
    required: [true, 'Please add address']
  },
  qualification: {
    type: String,
    required: [true, 'Please add qualification']
  },
  
  phoneNumber: {
    type: String,
    required: [true, 'Please add phone number'],
    match: [/^[0-9]{10}$/, 'Please add a valid 10-digit phone number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  
  // Document Upload (NEW)
  documents: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  profileComplete: {
    type: Boolean,
    default: false
  },
  
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Please select a course']
  },
  
  // Fee Structure with Discount (UPGRADED)
  totalFees: {
    type: Number,
    required: [true, 'Please add total fees'],
    min: 0
  },
  discount: {
    couponCode: String,
    percentage: Number,
    appliedAmount: Number
  },
  finalFees: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Installments (NEW)
  installments: [{
    installmentNumber: Number,
    amount: Number,
    dueDate: Date,
    paidDate: Date,
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending'
    }
  }],
  
  paidFees: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingFees: {
    type: Number,
    required: true
  },
  
  // Payment History
  payments: [{
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'bank_transfer', 'cheque'],
      default: 'cash'
    },
    remarks: String,
    installmentId: mongoose.Schema.Types.ObjectId
  }],
  
  // Course Duration (NEW)
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  courseDuration: {
    type: Number, // in months
    required: true,
    min: 1
  },
  courseEndDate: Date,
  courseCompleted: {
    type: Boolean,
    default: false
  },
  
  // Certificate (UPGRADED CRITERIA)
  certificateEligible: {
    type: Boolean,
    default: false
  },
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateIssuedDate: Date,
  
  // Status - REMOVED 'enquiry' (now separate Enquiry model)
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  
  // Invoice (NEW)
  invoiceGenerated: {
    type: Boolean,
    default: false
  },
  invoiceUrl: String,
  
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for full name
studentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.fatherName} ${this.lastName}`;
});

// Pre-save hook with upgraded logic
studentSchema.pre('save', function(next) {
  // Calculate pending fees
  this.pendingFees = this.finalFees - this.paidFees;
  
  // Check profile completion - require at least 2 documents
  this.profileComplete = this.documents && this.documents.length >= 2;
  
  // Update installment statuses (check for overdue)
  if (this.installments && this.installments.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    this.installments.forEach(inst => {
      if (inst.status === 'pending' && inst.dueDate) {
        const dueDate = new Date(inst.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (today > dueDate) {
          inst.status = 'overdue';
        }
      }
    });
  }
  
  // Calculate course end date
  if (this.enrollmentDate && this.courseDuration) {
    const endDate = new Date(this.enrollmentDate);
    endDate.setMonth(endDate.getMonth() + this.courseDuration);
    this.courseEndDate = endDate;
  }
  
  // NEW CERTIFICATE CRITERIA:
  // 1. Full payment (pendingFees === 0)
  // 2. Course duration completed
  // 3. 7 working days after course end date
  // 4. Documents uploaded (profileComplete)
  if (this.courseCompleted && this.pendingFees === 0 && this.courseEndDate && this.profileComplete) {
    const sevenDaysAfter = new Date(this.courseEndDate);
    sevenDaysAfter.setDate(sevenDaysAfter.getDate() + 7);
    
    if (new Date() >= sevenDaysAfter) {
      this.certificateEligible = true;
    }
  } else {
    this.certificateEligible = false;
  }
  
  next();
});

module.exports = mongoose.model('Student', studentSchema);
