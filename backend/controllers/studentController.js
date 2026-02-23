const Student = require('../models/Student');
const { generateInvoice } = require('../utils/invoiceGenerator');

exports.addStudent = async (req, res) => {
  try {
    const { firstName, fatherName, lastName, phoneNumber, email, address, qualification, course, totalFees, paidFees, initialPaymentMethod, couponCode, courseDuration, installments } = req.body;

    const existingStudent = await Student.findOne({ phoneNumber });
    if (existingStudent) {
      return res.status(400).json({ message: 'A student with this phone number already exists' });
    }

    let discountData = null;
    let finalFees = Number(totalFees);

    if (couponCode) {
      const Discount = require('../models/Discount');
      const coupon = await Discount.findOne({ couponCode: couponCode.toUpperCase() });
      if (coupon && coupon.isValid()) {
        const applied = coupon.applyDiscount(Number(totalFees));
        finalFees = applied.finalFees;
        discountData = { couponCode: coupon.couponCode, percentage: coupon.percentage, appliedAmount: applied.discountAmount };
        await coupon.incrementUsage();
      } else {
        return res.status(400).json({ message: 'Invalid or expired coupon code' });
      }
    }

    const initialPayment = Number(paidFees) || 0;

    // Build installments if provided
    let installmentData = [];
    if (installments && Array.isArray(installments)) {
      installmentData = installments.map((inst, i) => {
        const installmentObj = {
          installmentNumber: i + 1,
          amount: inst.amount,
          dueDate: new Date(inst.dueDate),
          status: 'pending'
        };
        
        // If initial payment equals first installment, mark it as paid
        if (i === 0 && initialPayment > 0 && initialPayment >= inst.amount) {
          installmentObj.status = 'paid';
          installmentObj.paidDate = new Date();
        }
        
        return installmentObj;
      });
    }

    const student = await Student.create({
      firstName, fatherName, lastName,
      phoneNumber, email, address, qualification,
      course, totalFees: Number(totalFees),
      discount: discountData,
      finalFees,
      paidFees: initialPayment,
      pendingFees: finalFees - initialPayment,
      courseDuration: Number(courseDuration) || 3,
      installments: installmentData,
      enrollmentDate: new Date(),
      status: 'active',
      addedBy: req.user._id,
      payments: []
    });

    // Now add payment with correct installment reference
    if (initialPayment > 0 && installmentData.length > 0 && initialPayment >= installmentData[0].amount) {
      // Link to first installment
      student.payments.push({
        amount: initialPayment,
        paymentMethod: initialPaymentMethod || 'cash',
        remarks: 'First installment payment',
        receivedBy: req.user._id,
        installmentId: student.installments[0]._id
      });
      await student.save();
    } else if (initialPayment > 0) {
      // No installments or partial payment
      student.payments.push({
        amount: initialPayment,
        paymentMethod: initialPaymentMethod || 'cash',
        remarks: 'Initial payment',
        receivedBy: req.user._id
      });
      await student.save();
    }

    // Increment course enrolledCount
    const Course = require('../models/Course');
    await Course.findByIdAndUpdate(course, { $inc: { enrolledCount: 1 } });

    const populated = await Student.findById(student._id).populate('course', 'name duration').populate('addedBy', 'name');
    
    // Generate invoice
    const invoiceNumber = `${Date.now()}-${student._id.toString().slice(-6).toUpperCase()}`;
    const invoice = await generateInvoice(populated, invoiceNumber);
    
    // Update student with invoice info
    populated.invoiceGenerated = true;
    populated.invoiceUrl = invoice.filePath;
    await populated.save();
    
    res.status(201).json({ 
      message: 'Student added successfully', 
      student: populated,
      invoice: {
        url: invoice.filePath,
        fileName: invoice.fileName
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const { status, course } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (course) filter.course = course;

    const students = await Student.find(filter)
      .populate('course', 'name duration fees')
      .populate('addedBy', 'name')
      .sort('-createdAt');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('course', 'name duration fees')
      .populate('addedBy', 'name')
      .populate('payments.receivedBy', 'name');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const fields = ['firstName','fatherName','lastName','phoneNumber','email','address','qualification','course','totalFees','status','courseDuration','courseCompleted'];
    fields.forEach(f => { if (req.body[f] !== undefined) student[f] = req.body[f]; });

    const updated = await student.save();
    const populated = await Student.findById(updated._id).populate('course', 'name duration');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    // Decrement course enrolledCount
    const Course = require('../models/Course');
    await Course.findByIdAndUpdate(student.course, { $inc: { enrolledCount: -1 } });
    
    await student.deleteOne();
    res.json({ message: 'Student removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const { amount, paymentMethod, remarks, installmentId } = req.body;

    if (Number(amount) <= 0) return res.status(400).json({ message: 'Payment amount must be greater than 0' });
    if (student.paidFees + Number(amount) > student.finalFees) return res.status(400).json({ message: 'Payment exceeds total fees' });

    let targetInstallmentId = installmentId;
    
    // If no installmentId provided, auto-assign to next pending installment
    if (!targetInstallmentId && student.installments.length > 0) {
      const nextPending = student.installments.find(inst => inst.status === 'pending');
      if (nextPending) {
        targetInstallmentId = nextPending._id;
      }
    }

    student.payments.push({ 
      amount: Number(amount), 
      paymentMethod: paymentMethod || 'cash', 
      remarks, 
      receivedBy: req.user._id, 
      installmentId: targetInstallmentId 
    });
    student.paidFees += Number(amount);

    // Mark installment as paid and update paid date (even if early)
    if (targetInstallmentId) {
      const inst = student.installments.id(targetInstallmentId);
      if (inst) { 
        inst.status = 'paid'; 
        inst.paidDate = new Date(); // Always set to current date when paid
      }
    }

    await student.save();
    const updated = await Student.findById(student._id).populate('course', 'name').populate('payments.receivedBy', 'name');
    
    // Generate updated invoice
    const invoiceNumber = `${Date.now()}-${student._id.toString().slice(-6).toUpperCase()}`;
    const invoice = await generateInvoice(updated, invoiceNumber);
    updated.invoiceUrl = invoice.filePath;
    await updated.save();
    
    res.json({ 
      student: updated,
      invoice: {
        url: invoice.filePath,
        fileName: invoice.fileName
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload document for student
// @route   POST /api/students/:id/upload-document
// @access  Private (Admin/Staff)
exports.uploadDocument = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Add document to student's documents array
    student.documents.push({
      fileName: req.file.originalname,
      fileUrl: `/uploads/documents/${req.file.filename}`,
      uploadedAt: new Date()
    });

    // Update profileComplete status
    student.profileComplete = true;

    await student.save();

    const updated = await Student.findById(student._id).populate('course', 'name');
    res.json({ 
      message: 'Document uploaded successfully', 
      student: updated 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
