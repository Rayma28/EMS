const { v4: uuidv4 } = require('uuid');
const { ProfileEditRequest, Employee, User } = require('../models');
const { sendEmail } = require('../utils/email');
const { Op } = require('sequelize');

const ALLOWED_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'gender',
  'dob',
  'pan_number',
  'aadhaar_number'
];

const createProfileEditRequest = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, { attributes: ['email'] });

    if (!user || !user.email) {
      return res.status(400).json({ success: false, message: 'Email not found' });
    }

    const userEmail = user.email;

    const employee = await Employee.findOne({
      where: { user_id: userId },
      attributes: ['employee_id', 'first_name', 'last_name']
    });

    if (!employee) {
      return res.status(403).json({ success: false, message: 'No employee profile' });
    }

    const employeeId = employee.employee_id;
    const firstName = employee.first_name || 'Employee';

    const { changes } = req.body;

    if (!changes || typeof changes !== 'object' || !Object.keys(changes).length) {
      return res.status(400).json({ success: false, message: 'No changes provided' });
    }

    const requestedChanges = {};
    for (const key of ALLOWED_FIELDS) {
      if (changes[key] !== undefined) requestedChanges[key] = changes[key];
    }

    if (!Object.keys(requestedChanges).length) {
      return res.status(400).json({ success: false, message: 'No valid fields' });
    }

    const existing = await ProfileEditRequest.findOne({
      where: {
        employee_id: employeeId,
        status: 'pending',

        // ✅ FIX
        createdAt: {
          [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    if (existing) {
      return res.status(429).json({ success: false, message: 'Pending request exists' });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const request = await ProfileEditRequest.create({
      employee_id: employeeId,
      requested_changes: requestedChanges,
      token,
      expires_at: expiresAt,
      status: 'pending'
    });

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3002';
    const editLink = `${frontendBase}/profile-edit/${token}`;

    const emailText = `
Dear ${firstName},

You requested a profile update.

Proceed here: ${editLink}

Expires in 7 days.

Regards,
HR Team
    `.trim();

    await sendEmail(userEmail, 'Profile Update Request', emailText)
      .catch(err => console.warn('Email failed:', err));

    res.status(201).json({
      success: true,
      message: 'Request created. Check your email.',
      requestId: request.id
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getPendingProfileRequests = async (req, res) => {
  try {

    const requests = await ProfileEditRequest.findAll({
      where: { status: 'pending' },

      include: [
        {
          model: Employee,
          attributes: ['employee_id', 'first_name', 'last_name'],
          include: [
            {
              model: User,
              attributes: ['email']
            }
          ]
        }
      ],

  
      order: [['createdAt', 'DESC']]
    });

    const formatted = requests.map(r => ({
      id: r.id,
      employee_id: r.Employee.employee_id,
      employee_name: `${r.Employee.first_name || ''} ${r.Employee.last_name || ''}`.trim(),
      employee_email: r.Employee.User?.email || null,
      requested_changes: r.requested_changes,
      status: r.status,

      created_at: r.createdAt ? r.createdAt.toISOString() : null,

      expires_at: r.expires_at ? r.expires_at.toISOString() : null,

      comment: r.hr_comment || null
    }));

    res.json(formatted);

  } catch (error) {
    console.error('Fetch pending error:', error);
    res.status(500).json({ success: false, message: 'Failed to load requests' });
  }
};

const approveProfileRequest = async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body || {};

  try {
    const request = await ProfileEditRequest.findByPk(id, {
      include: [{ model: Employee }]
    });

    if (!request)
      return res.status(404).json({ success: false, message: 'Request not found' });

    if (request.status !== 'pending')
      return res.status(400).json({ success: false, message: 'Already processed' });

    await request.Employee.update(request.requested_changes);

    await request.update({
      status: 'approved',

     
      hr_comment: comment || null,

      processed_by: req.user.id,
      processed_at: new Date()
    });

    res.json({ success: true, message: 'Request approved and applied' });

  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const rejectProfileRequest = async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body || {};

  try {
    const request = await ProfileEditRequest.findByPk(id);

    if (!request)
      return res.status(404).json({ success: false, message: 'Request not found' });

    if (request.status !== 'pending')
      return res.status(400).json({ success: false, message: 'Already processed' });

    await request.update({
      status: 'rejected',

     
      hr_comment: comment || 'No comment provided',

      processed_by: req.user.id,
      processed_at: new Date()
    });

    res.json({ success: true, message: 'Request rejected' });

  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createProfileEditRequest,
  getPendingProfileRequests,
  approveProfileRequest,
  rejectProfileRequest
};
