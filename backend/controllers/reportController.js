const { Employee, Attendance, Payroll, User, Department, LeaveRequest } = require('../models');
const { generateExcel } = require('../utils/excelExport');
const dayjs = require('dayjs');
const { Op } = require('sequelize');

/* ===================== EMPLOYEE REPORT ===================== */
const getEmployeeReport = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      include: [
        { model: User, attributes: ['username', 'email', 'role'] },
        { model: Department, attributes: ['department_name'] },
      ],
    });

    if (!employees.length) return res.status(404).json({ message: 'No employee data found' });

    const excelBuffer = await generateExcel(employees, 'employees');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=employees_report.xlsx');
    res.send(excelBuffer);
  } catch (err) {
    console.error('Employee report error:', err);
    res.status(500).json({ message: 'Failed to generate employee report' });
  }
};

/* ===================== ATTENDANCE REPORT ===================== */
const getAttendanceReport = async (req, res) => {
  const { month, year } = req.query;

  try {
    if (!month && !year)
      return res.status(400).json({ message: 'Please provide a month or year filter' });

    let startDate, endDate;
    if (month) {
      startDate = `${month}-01`;
      endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');
    } else {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    const attendances = await Attendance.findAll({
      where: { date: { [Op.between]: [startDate, endDate] } },
      include: [{ model: Employee, attributes: ['employee_id', 'first_name', 'last_name'] }],
      order: [['date', 'ASC']],
    });

    const leaves = await LeaveRequest.findAll({
      where: {
        [Op.or]: [
          { start_date: { [Op.between]: [startDate, endDate] } },
          { end_date: { [Op.between]: [startDate, endDate] } },
        ],
      },
    });

    if (!attendances.length && !leaves.length)
      return res.status(404).json({ message: 'No attendance or leave data found' });

    const excelBuffer = await generateExcel({ attendance: attendances, leaves }, 'attendance');

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
    res.send(excelBuffer);
  } catch (err) {
    console.error('Attendance report error:', err);
    res.status(500).json({
      message: 'Failed to generate attendance report',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

/* ===================== PAYROLL REPORT ===================== */
const getPayrollReport = async (req, res) => {
  const { month, year } = req.query;

  try {
    let where = {};
    if (month) where.month = month;
    if (year) where.year = year;

    const payrolls = await Payroll.findAll({
      where,
      include: [{ model: Employee, attributes: ['first_name', 'last_name'] }],
      order: [['month', 'ASC']],
    });

    if (!payrolls.length) return res.status(404).json({ message: 'No payroll data found' });

    const excelBuffer = await generateExcel(payrolls, 'payroll');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=payroll_report.xlsx');
    res.send(excelBuffer);
  } catch (err) {
    console.error('Payroll report error:', err);
    res.status(500).json({ message: 'Failed to generate payroll report' });
  }
};

module.exports = {
  getEmployeeReport,
  getAttendanceReport,
  getPayrollReport,
};