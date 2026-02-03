const express = require('express');
const authRoutes = require('./authRoutes');
const employeeRoutes = require('./employeeRoutes');
const departmentRoutes = require('./departmentRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const leaveRoutes = require('./leaveRoutes');
const payrollRoutes = require('./payrollRoutes');
const performanceRoutes = require('./performanceRoutes');
const reportRoutes = require('./reportRoutes');
const userRoutes = require('./userRoutes');
const requestRoutes = require('./requestRoutes');
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/departments', departmentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leaves', leaveRoutes);
router.use('/payroll', payrollRoutes);
router.use('/performance', performanceRoutes);
router.use('/reports', reportRoutes);
router.use('/users', userRoutes);   
router.use('/requests', requestRoutes);

module.exports = router;    