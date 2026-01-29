const { Employee, Attendance, Payroll, User, Department, LeaveRequest } = require('../models');
const { generateExcel } = require('../utils/excelExport');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

const getEmployeeReport = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      include: [
        { model: User, attributes: ['username', 'email', 'role'], required: false },
        { model: Department, attributes: ['department_name'], required: false },
      ],
      order: [['first_name', 'ASC']],
    });

    if (!employees.length) {
      return res.status(404).json({ message: 'No employee data found' });
    }

    const excelBuffer = await generateExcel(employees, 'employees');

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=employees_report.xlsx');
    res.send(excelBuffer);
  } catch (err) {
    console.error('Employee report error:', err);
    res.status(500).json({
      message: 'Failed to generate employee report',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

const getAttendanceReport = async (req, res) => {
  const { month, year } = req.query;

  try {
    // Validate input
    if (!month && !year) {
      return res.status(400).json({ message: 'Please provide month (YYYY-MM) or year' });
    }

    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
    }

    if (year && !/^\d{4}$/.test(year)) {
      return res.status(400).json({ message: 'Invalid year format. Use YYYY' });
    }

    let startDate, endDate;
    if (month) {
      startDate = `${month}-01`;
      endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');
    } else {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    const attendances = await Attendance.findAll({
      where: {
        date: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
      include: [
        {
          model: Employee,
          attributes: ['employee_id', 'first_name', 'last_name'],
          required: true,
        },
      ],
      order: [['date', 'ASC']],
    });

    const leaves = await LeaveRequest.findAll({
      where: {
        [Op.and]: [
          { start_date: { [Op.lte]: endDate } },
          { end_date: { [Op.gte]: startDate } },
        ],
      },
      include: [
        {
          model: Employee,
          attributes: ['first_name', 'last_name'],
        },
      ],
    });

    // Always generate Excel
    const excelBuffer = await generateExcel({ attendances, leaves }, 'attendance');

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=attendance_report_${month || year}.xlsx`
    );
    res.send(excelBuffer);
  } catch (err) {
    console.error('Attendance report error:', err);
    res.status(500).json({
      message: 'Failed to generate attendance report',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

const getPayrollReport = async (req, res) => {
  const { month, year } = req.query;

  try {
    if (!month && !year) {
      return res.status(400).json({ message: 'Please provide month (YYYY-MM) or year' });
    }

    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
    }

    if (year && !/^\d{4}$/.test(year)) {
      return res.status(400).json({ message: 'Invalid year format. Use YYYY' });
    }

    let where = {};

    if (month) {
      where.month = month;
    } else if (year) {
      where.month = {
        [Op.startsWith]: `${year}-`,
      };
    }

    const payrolls = await Payroll.findAll({
      where,
      include: [
        {
          model: Employee,
          attributes: ['first_name', 'last_name'],
          required: true,
        },
      ],
      order: [['month', 'ASC']],
    });

    if (!payrolls.length) {
      return res.status(404).json({ message: 'No payroll data found for the selected period' });
    }

    const excelBuffer = await generateExcel(payrolls, 'payroll');

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payroll_report_${month || year}.xlsx`
    );
    res.send(excelBuffer);
  } catch (err) {
    console.error('Payroll report error:', err);
    res.status(500).json({
      message: 'Failed to generate payroll report',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

module.exports = {
  getEmployeeReport,
  getAttendanceReport,
  getPayrollReport,
};