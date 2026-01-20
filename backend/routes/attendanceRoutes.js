// routes/attendanceRoutes.js
const express = require('express');
const {
  getAttendances,
  checkIn,
  checkOut,
  getMonthlySummary,
  getAllDailyAttendance,
  getAllMonthlySummary,
} = require('../controllers/attendanceController');
const { getMonthlyLeaves,} = require('../controllers/leaveController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize(['Admin', 'HR', 'Manager', 'Superuser']), getAttendances);
router.post('/checkin', authenticate, authorize(['Employee', 'HR', 'Manager', 'Superuser']), checkIn);
router.post('/checkout', authenticate, authorize(['Employee', 'HR', 'Manager', 'Superuser']), checkOut);
router.get('/monthly/:month', authenticate, authorize(['Employee', 'HR', 'Admin', 'Manager', 'Superuser']), getMonthlySummary);
router.get('/all/monthly/:month', authenticate, authorize(['Admin', 'HR', 'Manager', 'Superuser']), getAllMonthlySummary);
router.get('/leaves/monthly/:month', authenticate, authorize(['Employee', 'HR', 'Superuser']), getMonthlyLeaves);
router.get('/all/date/:date', authenticate, authorize(['Admin', 'HR', 'Manager', 'Superuser']), getAllDailyAttendance);

module.exports = router;