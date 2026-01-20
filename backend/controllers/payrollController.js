const { Payroll, Employee } = require('../models');
const { generatePDF } = require('../utils/pdfExport');

const getPayrolls = async (req, res) => {
  try {
    const payrolls = await Payroll.findAll({ include: Employee });
    res.json(payrolls);
  } catch (err) {
    console.error('Error fetching payrolls:', err);
    res.status(500).json({ message: err.message });
  }
};

const generatePayroll = async (req, res) => {
  const { employee_id, month, basic_salary, bonus, deductions, monthly_salary } = req.body;

  const monthly = Number(monthly_salary) || 0;
  const bon = Number(bonus) || 0;
  const ded = Number(deductions) || 0;
  const basic = Number(basic_salary) || 0;

  const net_salary = monthly + bon - ded;
  const payment_date = new Date().toISOString().split('T')[0];

  try {
    const existing = await Payroll.findOne({
      where: { employee_id, month }
    });

    if (existing) {
      return res.status(400).json({
        message: 'Payroll already exists for this employee and month'
      });
    }

    const payroll = await Payroll.create({
      employee_id,
      month,
      basic_salary: basic,
      monthly_salary: monthly,
      bonus: bon,
      deductions: ded,
      net_salary,
      payment_date
    });

    const payrollWithEmployee = await Payroll.findByPk(payroll.payroll_id, {
      include: Employee
    });

    res.status(201).json(payrollWithEmployee);
  } catch (err) {
    console.error('Error generating payroll:', err);
    res.status(500).json({ message: err.message });
  }
};

const getPayslip = async (req, res) => {
  try {
    const payroll = await Payroll.findByPk(req.params.id, { include: Employee });
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }

    const pdfBuffer = await generatePDF(payroll);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename=payslip_${payroll.payroll_id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating payslip:', err);
    res.status(500).json({ message: err.message });
  }
};

const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;

    const payroll = await Payroll.findByPk(id);

    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    await payroll.destroy();

    res.json({ message: 'Payroll record deleted successfully' });
  } catch (err) {
    console.error('Error deleting payroll:', err);
    res.status(500).json({ message: 'Failed to delete payroll record' });
  }
};

module.exports = { 
  getPayrolls, 
  generatePayroll, 
  getPayslip, 
  deletePayroll  
};