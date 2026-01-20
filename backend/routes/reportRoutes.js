const express = require('express');
const { getEmployeeReport, getAttendanceReport, getPayrollReport } = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/employees', authenticate, authorize(['Admin', 'HR', 'Superuser']), getEmployeeReport);
router.get('/attendance', authenticate, authorize(['Admin', 'HR', 'Superuser']), getAttendanceReport);
router.get('/payroll', authenticate, authorize(['Admin', 'HR', 'Superuser']), getPayrollReport);

module.exports = router;