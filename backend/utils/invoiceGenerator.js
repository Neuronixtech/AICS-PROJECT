const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateInvoice = async (student, invoiceNumber) => {
  return new Promise((resolve, reject) => {
    try {
      const invoiceDir = path.join(__dirname, '../../uploads/invoices');
      if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir, { recursive: true });
      }

      const fileName = `invoice_${student._id}_${Date.now()}.pdf`;
      const filePath = path.join(invoiceDir, fileName);
      const doc = new PDFDocument({ size: 'A4', margin: 30 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // COMPACT HEADER
      doc.fontSize(22).fillColor('#1e40af').text('AICS COMPUTERS', { align: 'center' });
      doc.fontSize(8).fillColor('#6b7280').text('123 Education St, City - 586101 | Phone: +91 98765 43210', { align: 'center' });
      doc.moveDown(0.8);
      doc.fontSize(18).fillColor('#1e3a8a').text('FEE RECEIPT', { align: 'center' });
      doc.moveDown(0.5);
      
      // Invoice details - RIGHT ALIGNED IN BOX
      const invoiceBoxY = 70;
      doc.rect(420, invoiceBoxY, 145, 35).stroke('#d1d5db');
      doc.fontSize(8).fillColor('#374151');
      doc.text('Invoice No:', 430, invoiceBoxY + 8);
      doc.fillColor('#1e40af').fontSize(9).text(`INV-${invoiceNumber}`, 430, invoiceBoxY + 18);
      doc.fillColor('#374151').fontSize(8).text('Date:', 430, invoiceBoxY + 28);
      doc.text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 490, invoiceBoxY + 28);
      
      doc.moveDown(3);

      // STUDENT DETAILS - Compact 2-column
      const studentY = doc.y;
      doc.rect(30, studentY, 535, 55).fillAndStroke('#f3f4f6', '#d1d5db');
      
      doc.fontSize(9).fillColor('#1e40af').text('STUDENT DETAILS', 40, studentY + 8);
      doc.fontSize(8).fillColor('#000000');
      
      doc.text(`Name:`, 40, studentY + 22);
      doc.fillColor('#374151').text(`${student.firstName} ${student.fatherName} ${student.lastName}`, 100, studentY + 22);
      
      doc.fillColor('#000000').text(`Phone:`, 40, studentY + 34);
      doc.fillColor('#374151').text(student.phoneNumber, 100, studentY + 34);
      
      doc.fillColor('#000000').text(`Course:`, 300, studentY + 22);
      doc.fillColor('#1e40af').fontSize(9).text(student.course?.name || 'N/A', 350, studentY + 22);
      
      doc.fillColor('#000000').fontSize(8).text(`Duration:`, 300, studentY + 34);
      doc.fillColor('#374151').text(`${student.courseDuration || student.course?.duration || 'N/A'} months`, 350, studentY + 34);

      doc.moveDown(4);

      // FEE BREAKDOWN - Compact
      doc.fontSize(11).fillColor('#1e40af').text('FEE BREAKDOWN', 30);
      doc.moveDown(0.5);
      
      const feeTableY = doc.y;
      
      // Table Header
      doc.rect(30, feeTableY, 535, 20).fillAndStroke('#1e40af', '#1e40af');
      doc.fontSize(9).fillColor('#ffffff');
      doc.text('Description', 40, feeTableY + 6);
      doc.text('Amount (Rs.)', 450, feeTableY + 6, { width: 105, align: 'right' });
      
      let currentY = feeTableY + 20;
      
      // Course Fee
      doc.rect(30, currentY, 535, 20).stroke('#d1d5db');
      doc.fillColor('#000000');
      doc.fontSize(9).text('Course Fee', 40, currentY + 6);
      doc.text(student.totalFees.toLocaleString('en-IN'), 450, currentY + 6, { width: 105, align: 'right' });
      currentY += 20;

      // Discount
      if (student.discount && student.discount.appliedAmount) {
        doc.rect(30, currentY, 535, 20).stroke('#d1d5db');
        doc.fillColor('#059669');
        doc.fontSize(9).text(`Discount (${student.discount.couponCode} - ${student.discount.percentage}%)`, 40, currentY + 6);
        doc.text(`-${student.discount.appliedAmount.toLocaleString('en-IN')}`, 450, currentY + 6, { width: 105, align: 'right' });
        currentY += 20;
      }

      // Total
      doc.rect(30, currentY, 535, 22).fillAndStroke('#f3f4f6', '#d1d5db');
      doc.fontSize(10).fillColor('#1e40af');
      doc.text('TOTAL PAYABLE', 40, currentY + 6);
      doc.text(`Rs.${student.finalFees.toLocaleString('en-IN')}`, 450, currentY + 6, { width: 105, align: 'right' });
      
      doc.moveDown(3);
      
      doc.moveDown(2);

      // PAYMENT DETAILS - Show either full payment or installments
      doc.fontSize(10).fillColor('#1e40af').text('PAYMENT DETAILS', 30);
      doc.moveDown(0.3);
      
      const payTableY = doc.y;
      
      if (student.installments && student.installments.length > 1) {
        // INSTALLMENT TABLE - Compact
        doc.rect(30, payTableY, 535, 20).fillAndStroke('#1e40af', '#1e40af');
        doc.fontSize(8).fillColor('#ffffff');
        doc.text('#', 45, payTableY + 6);
        doc.text('Amount', 100, payTableY + 6);
        doc.text('Due Date', 220, payTableY + 6);
        doc.text('Paid Date', 320, payTableY + 6);
        doc.text('Method', 425, payTableY + 6);
        doc.text('Status', 490, payTableY + 6);
        
        let instY = payTableY + 20;
        
        student.installments.forEach((inst, idx) => {
          doc.rect(30, instY, 535, 18).stroke('#d1d5db');
          doc.fontSize(8).fillColor('#000000');
          
          doc.text(`${inst.installmentNumber || idx + 1}`, 45, instY + 5);
          doc.text(`Rs.${inst.amount.toLocaleString('en-IN')}`, 100, instY + 5);
          doc.text(inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-', 220, instY + 5);
          doc.text(inst.paidDate ? new Date(inst.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-', 320, instY + 5);
          
          // Find payment for this installment - improved matching
          let paymentMethod = '-';
          if (inst.status === 'paid' && student.payments && student.payments.length > 0) {
            // Try to find by installmentId first
            let payment = student.payments.find(p => 
              p.installmentId && inst._id && p.installmentId.toString() === inst._id.toString()
            );
            
            // If not found and this is the first installment, use first payment
            if (!payment && idx === 0) {
              payment = student.payments[0];
            }
            
            if (payment) {
              paymentMethod = (payment.paymentMethod || 'CASH').toUpperCase();
            }
          }
          doc.text(paymentMethod, 425, instY + 5);
          
          // Status with proper symbols
          if (inst.status === 'paid') {
            doc.fillColor('#059669').text('PAID', 490, instY + 5);
          } else if (inst.status === 'overdue') {
            doc.fillColor('#dc2626').text('OVERDUE', 490, instY + 5);
          } else {
            doc.fillColor('#f59e0b').text('PENDING', 490, instY + 5);
          }
          
          instY += 18;
        });
        
        doc.moveDown(instY - payTableY > 100 ? 1 : 2);
      } else {
        // FULL PAYMENT - Single row
        doc.rect(30, payTableY, 535, 20).fillAndStroke('#1e40af', '#1e40af');
        doc.fontSize(8).fillColor('#ffffff');
        doc.text('Date', 45, payTableY + 6);
        doc.text('Amount', 180, payTableY + 6);
        doc.text('Method', 320, payTableY + 6);
        doc.text('Status', 450, payTableY + 6);
        
        let fullPayY = payTableY + 20;
        
        if (student.payments && student.payments.length > 0) {
          const payment = student.payments[0];
          doc.rect(30, fullPayY, 535, 18).stroke('#d1d5db');
          doc.fontSize(8).fillColor('#000000');
          
          doc.text(new Date(payment.paidAt || payment.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 45, fullPayY + 5);
          doc.fillColor('#059669').text(`Rs.${payment.amount.toLocaleString('en-IN')}`, 180, fullPayY + 5);
          doc.fillColor('#000000').text((payment.paymentMethod || 'CASH').toUpperCase(), 320, fullPayY + 5);
          doc.fillColor('#059669').text('PAID', 450, fullPayY + 5);
        }
        
        doc.moveDown(3);
      }

      // PAYMENT SUMMARY - Compact
      const summaryY = doc.y;
      doc.roundedRect(300, summaryY, 265, 55, 3).fillAndStroke('#f0fdf4', '#86efac');
      
      doc.fontSize(9).fillColor('#000000');
      doc.text('Total Fees:', 315, summaryY + 10);
      doc.text(`Rs.${student.finalFees.toLocaleString('en-IN')}`, 450, summaryY + 10, { width: 105, align: 'right' });
      
      doc.fontSize(9).fillColor('#059669');
      doc.text('Paid:', 315, summaryY + 25);
      doc.text(`Rs.${student.paidFees.toLocaleString('en-IN')}`, 450, summaryY + 25, { width: 105, align: 'right' });
      
      doc.fontSize(10).fillColor(student.pendingFees > 0 ? '#dc2626' : '#059669');
      doc.text('Balance:', 315, summaryY + 40);
      doc.text(`Rs.${student.pendingFees.toLocaleString('en-IN')}`, 450, summaryY + 40, { width: 105, align: 'right' });

      // FOOTER - Compact
      doc.moveDown(3);
      doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke('#d1d5db');
      doc.moveDown(0.5);
      doc.fontSize(7).fillColor('#6b7280');
      doc.text('This is a computer-generated invoice. For queries: info@institute.com | +91 98765 43210', 30, doc.y, { width: 535, align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(7).text(`Generated: ${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}`, 30, doc.y, { width: 535, align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve({ fileName, filePath: `/uploads/invoices/${fileName}` });
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateInvoice };
