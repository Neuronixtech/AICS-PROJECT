const Student = require('../models/Student');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// @desc    Generate certificate for student
// @route   POST /api/certificates/generate/:studentId
// @access  Private/Admin
exports.generateCertificate = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId)
      .populate('course', 'name duration');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.status !== 'enrolled') {
      return res.status(400).json({ message: 'Student must be enrolled to receive certificate' });
    }

    if (student.pendingFees > 0) {
      return res.status(400).json({ 
        message: 'Cannot issue certificate. Student has pending fees.',
        pendingAmount: student.pendingFees
      });
    }

    if (student.certificateIssued) {
      return res.status(400).json({ message: 'Certificate already issued for this student' });
    }

    // Create certificates directory if it doesn't exist
    const certificatesDir = path.join(__dirname, '..', 'certificates');
    if (!fs.existsSync(certificatesDir)) {
      fs.mkdirSync(certificatesDir, { recursive: true });
    }

    const fileName = `certificate_${student._id}_${Date.now()}.pdf`;
    const filePath = path.join(certificatesDir, fileName);

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Pipe the PDF to a file
    doc.pipe(fs.createWriteStream(filePath));

    // Design the certificate
    // Border
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke();
    doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50).stroke();

    // Header
    doc.fontSize(32)
       .font('Helvetica-Bold')
       .text('CERTIFICATE OF COMPLETION', 0, 80, { align: 'center' });

    doc.moveDown(2);

    // Body
    doc.fontSize(16)
       .font('Helvetica')
       .text('This is to certify that', 0, 160, { align: 'center' });

    doc.moveDown(0.5);

    doc.fontSize(28)
       .font('Helvetica-Bold')
       .text(student.name.toUpperCase(), 0, 200, { align: 'center' });

    doc.moveDown(1);

    doc.fontSize(16)
       .font('Helvetica')
       .text('has successfully completed the course', 0, 260, { align: 'center' });

    doc.moveDown(0.5);

    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text(student.course.name, 0, 300, { align: 'center' });

    doc.moveDown(0.5);

    doc.fontSize(14)
       .font('Helvetica')
       .text(`Duration: ${student.course.duration}`, 0, 350, { align: 'center' });

    doc.moveDown(2);

    const issueDate = new Date();
    doc.fontSize(12)
       .text(`Issue Date: ${issueDate.toLocaleDateString('en-IN')}`, 0, 420, { align: 'center' });

    doc.moveDown(3);

    // Signature section
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('____________________', 100, 480);

    doc.fontSize(10)
       .font('Helvetica')
       .text('Authorized Signature', 100, 510);

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('____________________', doc.page.width - 250, 480);

    doc.fontSize(10)
       .font('Helvetica')
       .text('Director/Principal', doc.page.width - 250, 510);

    // Footer
    doc.fontSize(8)
       .font('Helvetica-Oblique')
       .text('This is a computer-generated certificate', 0, doc.page.height - 60, { align: 'center' });

    // Finalize the PDF
    doc.end();

    // Wait for PDF to be written
    doc.on('finish', async () => {
      // Update student record
      student.certificateIssued = true;
      student.certificateIssuedDate = new Date();
      await student.save();

      // Send the file
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Error sending file:', err);
        }
        // Optionally delete the file after sending
        // fs.unlinkSync(filePath);
      });
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get students eligible for certificate
// @route   GET /api/certificates/eligible
// @access  Private/Admin
exports.getEligibleStudents = async (req, res) => {
  try {
    const students = await Student.find({
      status: 'enrolled',
      pendingFees: 0,
      certificateIssued: false
    })
    .populate('course', 'name')
    .populate('addedBy', 'name')
    .sort('name');

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all issued certificates
// @route   GET /api/certificates/issued
// @access  Private/Admin
exports.getIssuedCertificates = async (req, res) => {
  try {
    const students = await Student.find({
      certificateIssued: true
    })
    .populate('course', 'name')
    .populate('addedBy', 'name')
    .sort('-certificateIssuedDate');

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
