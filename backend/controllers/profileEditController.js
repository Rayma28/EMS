// backend/controllers/profileEditController.js
const { ProfileEditRequest, Employee } = require('../models');
const { Op } = require('sequelize');
const { sendEmail } = require('../utils/email'); // your email helper

const ALLOWED_FIELDS = [
  'first_name', 'last_name', 'email', 'phone', 'gender', 'dob', 'pan_number', 'aadhaar_number'
];

const getProfileEditByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const request = await ProfileEditRequest.findOne({
      where: {
        token,
        status: 'pending',
        expires_at: { [Op.gt]: new Date() },
      },
      include: [{
        model: Employee,
        attributes: ['employee_id', 'first_name', 'last_name', 'email', 'phone', 'gender', 'dob', 'pan_number', 'aadhaar_number'],
      }],
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Invalid, expired, or already processed edit link.',
      });
    }

    // Return current data + pre-filled requested changes
    const current = request.Employee.toJSON();
    const requested = request.requested_changes;

    return res.json({
      success: true,
      current,
      requested,
      requestId: request.id,
    });
  } catch (error) {
    console.error('Error fetching edit request:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

const submitProfileEditByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { changes } = req.body;

    if (!changes || typeof changes !== 'object' || Object.keys(changes).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No changes provided',
      });
    }

    const request = await ProfileEditRequest.findOne({
      where: {
        token,
        status: 'pending',
        expires_at: { [Op.gt]: new Date() },
      },
      include: [Employee],
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Invalid, expired, or already processed edit link.',
      });
    }

    // Filter only allowed fields
    const safeChanges = {};
    for (const key of ALLOWED_FIELDS) {
      if (changes[key] !== undefined) {
        safeChanges[key] = changes[key];
      }
    }

    if (Object.keys(safeChanges).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    // Update employee record
    await request.Employee.update(safeChanges);

    // Mark request as approved
    await request.update({
      status: 'approved',
      hr_comment: 'Self-approved via secure link',
    });

    // Optional: send confirmation email to employee
    const emailText = `
Dear ${request.Employee.first_name || 'Employee'},

Your profile update request has been successfully processed and applied.

The following changes were made:
${Object.entries(safeChanges).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Thank you for keeping your information up to date.

Regards,
HR Team
EMS System
    `.trim();

    await sendEmail(request.Employee.email, 'Profile Update Confirmed', emailText)
      .catch(err => console.warn('Confirmation email failed:', err));

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
    });
  } catch (error) {
    console.error('Error submitting profile edit:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

module.exports = {
  getProfileEditByToken,
  submitProfileEditByToken,
};