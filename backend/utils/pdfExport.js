const PDFDocument = require('pdfkit');

const generatePDF = (data) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    doc.fontSize(25).text('Payslip', { align: 'center' });
    doc.fontSize(12).text(`Employee ID: ${data.employee_id}`);
    doc.text(`Month: ${data.month}`);
    doc.text(`Net Salary: ${data.net_salary}`);
    doc.end();
  });
};

module.exports = { generatePDF };