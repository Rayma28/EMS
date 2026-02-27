// backend/controllers/profileEditController.js
const { ProfileEditRequest, Employee } = require('../models');
const { Op } = require('sequelize');
const { sendEmail } = require('../utils/email');

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

const getProfileEditByToken = async (req, res) => {
  try {
    let { token } = req.params;
    const trimmedToken = token.trim(); // remove accidental spaces
    console.log(`[getProfileEditByToken] Incoming token: "${token}" (trimmed: "${trimmedToken}")`);

    const request = await ProfileEditRequest.findOne({
      where: {
        token: trimmedToken,
        status: 'pending',
        expires_at: { [Op.gt]: new Date() },
      },
      include: [{
        model: Employee,
        attributes: [
          'employee_id',
          'first_name',
          'last_name',
          'phone',
          'gender',
          'dob',
          'pan_number',
          'aadhaar_number'
          // email removed - does not exist in employees table
        ],
        required: true,
      }],
    });

    if (!request) {
      console.log(`[getProfileEditByToken] No matching pending request found for trimmed token: "${trimmedToken}"`);

      // Debug: show total pending requests
      const pendingCount = await ProfileEditRequest.count({ where: { status: 'pending' } });
      console.log(`Total pending requests in DB: ${pendingCount}`);

      // Optional: look for similar tokens (debug only)
      const similar = await ProfileEditRequest.findAll({
        where: {
          token: { [Op.iLike]: `%${trimmedToken}%` },
          status: 'pending'
        },
        limit: 3,
        attributes: ['id', 'token', 'status', 'expires_at']
      });
      if (similar.length) {
        console.log('Found similar pending tokens:', similar.map(s => s.toJSON()));
      } else {
        console.log('No similar pending tokens found.');
      }

      return res.status(404).json({
        success: false,
        message: 'Invalid, expired, or already processed edit link. Please request a new one from your profile page.',
      });
    }

    console.log(`[getProfileEditByToken] SUCCESS - Found request ID ${request.id} for employee ${request.Employee.employee_id}`);

    const current = request.Employee.toJSON();
    const requested = request.requested_changes;

    return res.json({
      success: true,
      current,
      requested,
      requestId: request.id,
    });
  } catch (error) {
    console.error('[getProfileEditByToken] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading edit request. Please try again or contact HR.',
    });
  }
};

const submitProfileEditByToken = async (req, res) => {
  try {
    let { token } = req.params;
    token = token.trim(); // safety
    const { changes } = req.body;

    console.log(`[submitProfileEditByToken] Token: "${token}", Changes received:`, changes);

    if (!changes || typeof changes !== 'object' || Object.keys(changes).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No changes provided in request body',
      });
    }

    const request = await ProfileEditRequest.findOne({
      where: {
        token: token,
        status: 'pending',
        expires_at: { [Op.gt]: new Date() },
      },
      include: [Employee],
    });

    if (!request) {
      console.log(`[submitProfileEditByToken] No valid pending request found for token: "${token}"`);
      return res.status(404).json({
        success: false,
        message: 'Invalid, expired, or already processed edit link. Please request a new one.',
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
        message: 'No valid fields to update (only allowed fields accepted)',
      });
    }

    // Apply changes to employee record
    await request.Employee.update(safeChanges);

    // Mark request as approved
    await request.update({
      status: 'approved',
      hr_comment: 'Self-approved via secure link',
      processed_at: new Date(),
    });

    // Send confirmation email
    const emailText = `
Dear ${request.Employee.first_name || 'Employee'},

Your profile update request has been successfully processed and applied.

The following changes were made:
${Object.entries(safeChanges)
  .map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`)
  .join('\n')}

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
    console.error('[submitProfileEditByToken] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile. Please try again or contact HR.',
    });
  }
};

module.exports = {
  getProfileEditByToken,
  submitProfileEditByToken,
};