const PDFDocument = require('pdfkit');

const generatePDF = (payrollData) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40
    });

    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    // ==================== HEADER ====================
doc.fontSize(26).font('Helvetica-Bold')
       .fillColor('#0a3d62')
       .text('KIT Solutions Pvt. Ltd.', { align: 'center' });

    doc.fontSize(10).font('Helvetica')
       .fillColor('#333333')
       .text('2nd Floor, Pelican Building, Above CITI Bank, Natubhai Circle, Vadodara - 390007, Gujarat, India', 
             { align: 'center' })
       .text('Email: contact@kitsol.com | Phone: +91 265 2339254', 
             { align: 'center' });

    doc.moveDown(1.8);

    // ==================== TITLE ====================
    doc.fontSize(30).font('Helvetica-Bold')
      .fillColor('#0a3d62')
      .text('PAYSLIP', { align: 'center' });

    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(4).stroke('#0a3d62');

    doc.moveDown(1);

    // ==================== DATA EXTRACTION ====================
    const employee = payrollData.Employee?.dataValues || payrollData.Employee || {};

    const empName =
      `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'N/A';

    const getValue = (obj, ...keys) => {
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) {
          return Number(obj[key]) || 0;
        }
      }
      return 0;
    };

    // ✅ YOUR ACTUAL DATA
    const annualBasic = getValue(payrollData, 'basic', 'basic_salary');
    const bonus = getValue(payrollData, 'bonus', 'bonus_amount');
    const deductions = getValue(payrollData, 'deductions', 'total_deductions');

    // ✅ CORE CALCULATION (FIXED)
    const monthlySalary = annualBasic / 12;
    const netSalary = monthlySalary + bonus - deductions;

    const format = (num) => `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

    // ==================== DETAILS ====================
    let y = doc.y;

    doc.fontSize(11).fillColor('#000');

    doc.text(`Employee: ${empName}`, 50, y);
    doc.text(`Month: ${payrollData.month || 'N/A'}`, 350, y);
    y += 25;

    doc.text(`Date: ${
      payrollData.payment_date
        ? new Date(payrollData.payment_date).toLocaleDateString('en-IN')
        : 'N/A'
    }`, 50, y);

    y += 30;

    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 20;

    // ==================== TABLE ====================
    doc.font('Helvetica-Bold');
    doc.text('Particulars', 50, y);
    doc.text('Amount', 400, y);
    y += 20;

    doc.font('Helvetica');

    doc.text('Basic (Annual)', 50, y);
    doc.text(format(annualBasic), 400, y);
    y += 20;

    doc.text('Monthly Salary', 50, y);
    doc.text(format(monthlySalary), 400, y);
    y += 20;

    doc.text('Bonus', 50, y);
    doc.text(format(bonus), 400, y);
    y += 20;

    doc.text('Deductions', 50, y);
    doc.text(`- ${format(deductions)}`, 400, y);
    y += 20;

    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 15;

    // ==================== NET ====================
    doc.rect(50, y - 5, 495, 35).fill('#0a3d62');

    doc.fillColor('#fff').font('Helvetica-Bold');

    doc.text('NET SALARY', 50, y);
    doc.text(format(netSalary), 400, y);

  // ==================== FOOTER ====================
    doc.fontSize(9.5).font('Helvetica')
       .fillColor('#555555')
       .text('This is a computer-generated document and does not require any signature.', 
             50, 735, { align: 'center', width: 495 });

    doc.text('Thank you for your dedication and hard work!', 50, 755, { align: 'center', width: 495 });

    doc.end();
  });
};

module.exports = { generatePDF };