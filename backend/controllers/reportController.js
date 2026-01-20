const { Employee, Attendance, Payroll } = require('../models');
const { generateExcel } = require('../utils/excelExport');

const getEmployeeReport = async (req, res) => {
  try {
    const employees = await Employee.findAll({ include: [User, Department] });
    const excelBuffer = await generateExcel(employees, 'employees');
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAttendanceReport = async (req, res) => {
  const { date } = req.query;
  try {
    const attendances = await Attendance.findAll({ where: date ? { date } : {}, include: Employee });
    const excelBuffer = await generateExcel(attendances, 'attendance');
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPayrollReport = async (req, res) => {
  const { month } = req.query;
  try {
    const payrolls = await Payroll.findAll({ where: month ? { month } : {}, include: Employee });
    const excelBuffer = await generateExcel(payrolls, 'payroll');
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getEmployeeReport, getAttendanceReport, getPayrollReport };