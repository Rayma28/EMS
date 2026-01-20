const express = require('express');
const { getPayrolls, generatePayroll, getPayslip, deletePayroll} = require('../controllers/payrollController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize(['Admin', 'HR', 'Superuser']), getPayrolls);
router.post('/generate', authenticate, authorize(['Admin', 'HR', 'Superuser']), generatePayroll);
router.get('/:id/payslip', authenticate, authorize(['Admin', 'HR', 'Employee', 'Superuser']), getPayslip);
router.delete('/:id', authenticate, authorize(['Admin', 'HR']), deletePayroll);

module.exports = router;