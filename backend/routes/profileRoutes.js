// backend/routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { ProfileEditRequest, Employee, User } = require('../models');
const { getMyProfile, updateMyProfile } = require('../controllers/profileController');
const {
  requestProfileUpdate,
  reviewInitialRequest,
  submitEditedProfile,
  finalDecision,
  getRequestStatus,
} = require('../controllers/profileRequestController');
const { authenticate, authorize } = require('../middleware/auth');

// Profile routes
router.get('/', authenticate, authorize(['Employee', 'HR', 'Manager', 'Admin']), getMyProfile);
router.put('/', authenticate, authorize(['Employee', 'HR', 'Manager', 'Admin']), updateMyProfile);

// Profile request routes
router.post('/profile-request', authenticate, authorize(['Employee', 'HR', 'Manager', 'Admin']), requestProfileUpdate);

router.get('/profile/request-status', authenticate, authorize(['Employee', 'HR', 'Manager', 'Admin']), getRequestStatus);

// HR first review (changed to PUT to match frontend)
router.put('/profile-request/:requestId/initial-review', authenticate, authorize(['HR', 'Admin']), reviewInitialRequest);

// Employee submits edit via token (no auth, token-based)
router.put('/profile/edit/:token', submitEditedProfile);  

// HR final decision (changed to PUT)
router.put('/profile-request/:requestId/final', authenticate, authorize(['HR', 'Admin']), finalDecision);

// HR view all relevant requests
router.get('/profile-requests/view', authenticate, authorize(['HR', 'Admin']), async (req, res) => {
  try {
    const currentUser = req.user; 
    const { initiator } = req.query;

    if (!['HR', 'Admin'].includes(currentUser.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let requestedByFilter = {};

    if (currentUser.role === 'Admin') {
      if (initiator === 'hr') {
        // Admin should see requests MADE BY HR users
        const hrUsers = await User.findAll({
          where: { role: 'HR' },
          attributes: ['id'],
        });
        const hrIds = hrUsers.map(u => u.id);
        requestedByFilter = { [Op.in]: hrIds };
      } else {
        // If no valid initiator or wrong value → show nothing or error
        return res.status(400).json({ message: 'Invalid or missing initiator parameter for Admin' });
      }
    } else if (currentUser.role === 'HR') {
      if (initiator === 'employee' || initiator === 'manager') {
        // HR should see requests NOT made by HR users
        const hrUsers = await User.findAll({
          where: { role: 'HR' },
          attributes: ['id'],
        });
        const hrIds = hrUsers.map(u => u.id);
        requestedByFilter = { [Op.notIn]: hrIds };
      } else {
        return res.status(400).json({ message: 'Invalid or missing initiator parameter for HR' });
      }
    }

    const requests = await ProfileEditRequest.findAll({
      where: {
        requested_by: requestedByFilter,
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['first_name', 'last_name'],
          required: true,
          include: [
            {
              model: User,
              attributes: ['email'],
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const formatted = requests.map(r => ({
      id: r.id,
      employee_id: r.employee_id,
      employee_name: r.employee
        ? `${r.employee.first_name || ''} ${r.employee.last_name || ''}`.trim() || 'Unknown'
        : 'Unknown',
      requested_changes: r.requested_changes || {},
      changes_submitted: r.changes_submitted || {},
      status: r.status,
      created_at: r.created_at.toISOString(),
      token_expires_at: r.token_expires_at ? r.token_expires_at.toISOString() : null,
      hr_comment: r.hr_comment,
      final_comment: r.final_comment,
    }));

    return res.status(200).json(formatted);
  } catch (err) {
    console.error('[GET /profile-requests/view] Error:', err);
    return res.status(500).json({ message: 'Failed to fetch profile requests' });
  }
});

router.get('/profile/edit/:token', async (req, res) => {
  try {
    const { token } = req.params;
    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    if (payload.purpose !== 'profile_edit') {
      return res.status(403).json({ success: false, message: 'Invalid token purpose' });
    }

    const requestRecord = await ProfileEditRequest.findByPk(payload.requestId);
    if (!requestRecord) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (requestRecord.status !== 'approved_initial') {
      return res.status(400).json({ success: false, message: 'Request not in editable state' });
    }

    if (new Date() > requestRecord.token_expires_at) {
      return res.status(410).json({ success: false, message: 'This edit link has expired' });
    }

    // Fetch current employee profile
    const employee = await Employee.findByPk(requestRecord.employee_id, {
      include: [{ model: User, attributes: ['email'] }],
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    return res.json({
      success: true,
      current: {
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.User?.email || '',
        phone: employee.phone || '',
        dob: employee.dob || '',
        gender: employee.gender || '',
        pan_number: employee.pan_number || '',
        aadhaar_number: employee.aadhaar_number || '',
      },
      requested: requestRecord.requested_changes || {},
    });
  } catch (err) {
    console.error('[GET /profile/edit/:token] Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;