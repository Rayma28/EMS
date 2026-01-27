// backend/controllers/attendanceController.js
const { Attendance, Employee, User } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

const getAttendances = async (req, res) => {
  try {
    const attendances = await Attendance.findAll({ include: [{ model: Employee }] });
    res.json(attendances);
  } catch (err) {
    console.error('getAttendances error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const checkIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findOne({ where: { user_id: userId } });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const employee_id = employee.employee_id;
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const check_in_time = now.toTimeString().slice(0, 8);

    const existing = await Attendance.findOne({ where: { employee_id, date } });
    if (existing) return res.status(400).json({ message: 'Already checked in today' });

    const attendance = await Attendance.create({
      employee_id,
      date,
      check_in: check_in_time,
      status: 'Present'
    });

    res.json({ message: 'Checked in successfully', attendance });
  } catch (err) {
    console.error('checkIn error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const checkOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findOne({ where: { user_id: userId } });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const employee_id = employee.employee_id;
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const check_out_time = now.toTimeString().slice(0, 8);

    const attendance = await Attendance.findOne({ where: { employee_id, date } });

    if (!attendance) {
      return res.status(400).json({ message: 'No check-in record found for today' });
    }

    if (attendance.check_out) {
      return res.status(400).json({ message: 'Already checked out today' });
    }

    await attendance.update({ check_out: check_out_time });
    res.json({ message: 'Checked out successfully', attendance });
  } catch (err) {
    console.error('checkOut error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMonthlySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findOne({ where: { user_id: userId } });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const employee_id = employee.employee_id;
    const month = req.params.month;

    const startDate = `${month}-01`;
    const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');

    const attendances = await Attendance.findAll({
      where: {
        employee_id,
        date: { [Op.gte]: startDate, [Op.lte]: endDate }
      },
      order: [['date', 'ASC']]
    });

    res.json(attendances);
  } catch (err) {
    console.error('getMonthlySummary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllMonthlySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const month = req.params.month;

    const startDate = `${month}-01`;
    const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');

    const queryOptions = {
      where: {
        date: { [Op.gte]: startDate, [Op.lte]: endDate }
      },
      include: [
        {
          model: Employee,
          include: [{ model: User }]
        }
      ],
      order: [['date', 'ASC']]
    };

    if (role === 'Manager') {
      queryOptions.where[Op.or] = [
        { '$Employee.User.role$': 'Employee' },
        { '$Employee.User.role$': 'Manager' }
      ];
    }

    const attendances = await Attendance.findAll(queryOptions);

    res.json(attendances);
  } catch (err) {
    console.error('getAllMonthlySummary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllDailyAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { date } = req.params;

    if (!dayjs(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const queryOptions = {
      where: { date },
      include: [
        {
          model: Employee,
          include: [{ model: User }]
        }
      ],
      order: [[Employee, 'first_name', 'ASC']],
    };

    if (role === 'Manager') {
      queryOptions.where[Op.or] = [
        { '$Employee.User.role$': 'Employee' },
        { '$Employee.User.role$': 'Manager' }
      ];
    }
    // HR, Admin, Superuser → see everyone

    const attendances = await Attendance.findAll(queryOptions);

    res.json(attendances);
  } catch (err) {
    console.error('getAllDailyAttendance error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAttendances,
  checkIn,
  checkOut,
  getMonthlySummary,
  getAllMonthlySummary,
  getAllDailyAttendance,
};