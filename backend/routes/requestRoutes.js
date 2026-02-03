const express = require('express');
const router = express.Router();
const {
  getRequests,
  createRequest,
  managerApprove,
  managerReject,
  adminApprove,
  adminReject,
  deleteRequest,
  updateRequest,
} = require('../controllers/requestController');

const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getRequests);
router.post('/', authenticate, authorize(['Employee', 'Manager', 'Superuser']), createRequest);

// Manager actions
router.put('/:id/manager/approve', authenticate, authorize(['Manager']), managerApprove);
router.put('/:id/manager/reject',  authenticate, authorize(['Manager']), managerReject);

// Admin actions
router.put('/:id/admin/approve', authenticate, authorize(['Admin', 'Superuser']), adminApprove);
router.put('/:id/admin/reject',  authenticate, authorize(['Admin', 'Superuser']), adminReject);

// Edit & Delete (creator or Admin)
router.put('/:id', authenticate, authorize(['Admin', 'Superuser', 'Employee', 'Manager']), updateRequest);
router.delete('/:id', authenticate, authorize(['Admin', 'Superuser', 'Employee', 'Manager']), deleteRequest);

module.exports = router;