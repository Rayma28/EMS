const express = require('express');
const { getLeaves, 
    applyLeave, 
    approveLeave, 
    rejectLeave, 
    deleteLeave, 
    getMonthlyLeaves} = require('../controllers/leaveController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize(['Admin', 'HR', 'Manager', 'Superuser', 'Employee']), getLeaves);
router.post('/apply', authenticate, authorize(['Employee', 'Manager', 'HR']), applyLeave);
router.put('/:id/approve', authenticate, authorize(['HR', 'Manager', 'Admin', 'Superuser']), approveLeave);
router.put('/:id/reject', authenticate, authorize(['HR', 'Manager', 'Admin', 'Superuser']), rejectLeave);
router.delete('/:id', authenticate, authorize(['Admin', 'HR', 'Manager', 'Superuser', 'Employee']), deleteLeave);
router.get('/monthly/:month', authenticate, authorize(['Employee', 'Manager', 'HR', 'Admin', 'Superuser']), getMonthlyLeaves);

module.exports = router;