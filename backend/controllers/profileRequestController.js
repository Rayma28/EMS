// backend/controllers/profileRequestController.js
const { Employee, User, ProfileEditRequest } = require('../models');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../utils/email');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'fc024c26dbaa64992128f0a01a96615b2986f9bb09d6a32710103f9e1c358c61';

// 1. Employee submits initial update request
const requestProfileUpdate = async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findOne({
      where: { user_id: userId },
      include: [{ model: User, attributes: ['email', 'username', 'role'] }],
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    const changes = req.body.changes || {};

    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ message: 'No changes provided' });
    }

    const approverRole = employee.User.role === 'HR' ? 'Admin' : 'HR';

    // Create the request
    const requestRecord = await ProfileEditRequest.create({
      employee_id: employee.employee_id,
      requested_by: userId,
      requested_changes: changes,
      status: 'pending_initial',
    });

    // Notify approvers
    const approvers = await User.findAll({ where: { role: approverRole } });
    const approverEmails = approvers.map((u) => u.email).filter(Boolean);

    if (approverEmails.length > 0) {
      const approverPath = approverRole.toLowerCase();
      const reviewLink = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/${approverPath}/requests/${requestRecord.id}`;
      await sendEmail(
        approverEmails.join(', '),
        'New Profile Update Request - Action Required',
        `Employee ${employee.first_name} ${employee.last_name} (${employee.User?.email || 'no email'}) has submitted a profile update request.\n\n` +
        `Please review and decide here: ${reviewLink}\n\n` +
        `Request ID: ${requestRecord.id}`
      );
    }

    return res.status(201).json({
      message: 'Profile update request sent for review',
      requestId: requestRecord.id,
    });
  } catch (err) {
    console.error('[requestProfileUpdate] Error:', err);
    return res.status(500).json({ message: 'Server error while creating request' });
  }
};

// 2. Approver first review (approve → send edit link / reject)
const reviewInitialRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, comment } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be "approve" or "reject"' });
    }

    const requestRecord = await ProfileEditRequest.findByPk(requestId);
    if (!requestRecord) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (requestRecord.status !== 'pending_initial') {
      return res.status(400).json({ message: `Cannot process request in current state: ${requestRecord.status}` });
    }

    const employee = await Employee.findByPk(requestRecord.employee_id, {
      include: [{ model: User, attributes: ['email', 'username', 'role'] }],
    });

    if (!employee?.User?.email) {
      return res.status(400).json({ message: 'Employee email not found – cannot notify' });
    }

    const approverRole = employee.User.role === 'HR' ? 'Admin' : 'HR';
    const approverTeam = `${approverRole} Team`;

    if (action === 'reject') {
      await requestRecord.update({
        status: 'rejected',
        hr_comment: comment?.trim() || 'No reason provided',
      });

      await sendEmail(
        employee.User.email,
        'Your Profile Update Request was Rejected',
        `Dear ${employee.first_name},\n\n` +
        `Your request to update profile information has been reviewed and **rejected** by the ${approverRole}.\n\n` +
        `Reason: ${comment?.trim() || 'No reason provided'}\n\n` +
        `If you believe this was in error, please contact the ${approverRole} directly.\n\n` +
        `Thank you,\n${approverTeam}`
      );

      return res.json({ message: 'Request rejected successfully' });
    }

    // Approve → send edit link
    const token = jwt.sign(
      {
        requestId: requestRecord.id,
        employeeId: employee.employee_id,
        purpose: 'profile_edit',
      },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    const editLink = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/profile/profile/edit/${token}`;

    await requestRecord.update({
      status: 'approved_initial',
      token,
      token_expires_at: new Date(Date.now() + 30 * 60 * 1000),
      hr_comment: comment?.trim() || null,
    });

    await sendEmail(
      employee.User.email,
      'Profile Update Request Approved – Edit Your Details Now',
      `Dear ${employee.first_name},\n\n` +
      `Good news! Your profile update request has been approved by the ${approverRole}.\n\n` +
      `You may now review and submit your final changes using the secure link below:\n` +
      `${editLink}\n\n` +
      `This link is valid for 30 minutes and can be used only once.\n\n` +
      (comment ? `${approverRole} note: ${comment.trim()}\n\n` : '') +
      `Best regards,\n${approverTeam}`
    );

    return res.json({ message: 'First approval granted. Secure edit link sent to employee.' });
  } catch (err) {
    console.error('[reviewInitialRequest] Error:', err);
    return res.status(500).json({ message: 'Server error during review' });
  }
};

// 3. Employee submits final changes via secure token
const submitEditedProfile = async (req, res) => {
  try {
    const { token } = req.params;
    let payload;

    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid or expired secure link' });
    }

    const requestRecord = await ProfileEditRequest.findByPk(payload.requestId);
    if (!requestRecord) return res.status(404).json({ message: 'Request not found' });

    if (requestRecord.status !== 'approved_initial') {
      return res.status(400).json({ message: `Cannot edit in current state: ${requestRecord.status}` });
    }

    if (new Date() > requestRecord.token_expires_at) {
      await requestRecord.update({ status: 'rejected' });
      return res.status(410).json({ message: 'This edit link has expired' });
    }

    const submittedChanges = req.body.changes || {};
    if (Object.keys(submittedChanges).length === 0) {
      return res.status(400).json({ message: 'No changes were submitted' });
    }

    await requestRecord.update({
      changes_submitted: submittedChanges,
      status: 'pending_final',
      token: null,
      token_expires_at: null,
    });

    // Determine approver and notify
    const employee = await Employee.findByPk(requestRecord.employee_id, {
      include: [{ model: User, attributes: ['email', 'username', 'role'] }],
    });
    const approverRole = employee.User.role === 'HR' ? 'Admin' : 'HR';
    const approvers = await User.findAll({ where: { role: approverRole } });
    const approverEmails = approvers.map(u => u.email).filter(Boolean);

    if (approverEmails.length > 0) {
      const approverPath = approverRole.toLowerCase();
      const reviewLink = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/${approverPath}/requests/${requestRecord.id}`;
      await sendEmail(
        approverEmails.join(', '),
        'Final Profile Changes Submitted – Final Approval Needed',
        `Employee has submitted final changes for approval.\n\n` +
        `Please review and make final decision here: ${reviewLink}\n\n` +
        `Request ID: ${requestRecord.id}`
      );
    }

    return res.json({
      success: true,
      message: 'Your changes have been submitted and are awaiting final approval.',
    });
  } catch (err) {
    console.error('[submitEditedProfile] Error:', err);
    return res.status(500).json({ message: 'Server error while submitting changes' });
  }
};

// 4. Approver final decision (approve → apply changes / reject)
const finalDecision = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, comment } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be "approve" or "reject"' });
    }

    const requestRecord = await ProfileEditRequest.findByPk(requestId);
    if (!requestRecord) return res.status(404).json({ message: 'Request not found' });

    if (requestRecord.status !== 'pending_final') {
      return res.status(400).json({ message: `Cannot finalize request in current state: ${requestRecord.status}` });
    }

    const employee = await Employee.findByPk(requestRecord.employee_id, {
      include: [{ model: User, attributes: ['email', 'username', 'role'] }],
    });

    if (!employee?.User?.email) {
      return res.status(400).json({ message: 'Employee email not found' });
    }

    const approverRole = employee.User.role === 'HR' ? 'Admin' : 'HR';
    const approverTeam = `${approverRole} Team`;

    if (action === 'reject') {
      await requestRecord.update({
        status: 'rejected',
        final_comment: comment?.trim() || 'No reason provided',
      });

      await sendEmail(
        employee.User.email,
        'Final Profile Update – Rejected',
        `Dear ${employee.first_name},\n\n` +
        `After review of your submitted changes, the ${approverRole} has decided **not to apply** them.\n\n` +
        `Reason: ${comment?.trim() || 'No reason provided'}\n\n` +
        `If you have questions or wish to submit a new request, please contact the ${approverRole}.\n\n` +
        `Thank you,\n${approverTeam}`
      );

      return res.json({ message: 'Final rejection completed' });
    }

    // Approve → apply changes
    const finalChanges = requestRecord.changes_submitted || {};

    await employee.update({
      first_name: finalChanges.first_name ?? employee.first_name,
      last_name: finalChanges.last_name ?? employee.last_name,
      phone: finalChanges.phone !== undefined ? finalChanges.phone : employee.phone,
      gender: finalChanges.gender ?? employee.gender,
      dob: finalChanges.dob ?? employee.dob,
      pan_number: finalChanges.pan_number ?? employee.pan_number,
      aadhaar_number: finalChanges.aadhaar_number ?? employee.aadhaar_number,
      email: finalChanges.email ?? employee.User.email,
    });

    await requestRecord.update({
      status: 'approved_final',
      final_comment: comment?.trim() || 'Final approval granted',
    });

    await sendEmail(
      employee.User.email,
      'Profile Successfully Updated',
      `Dear ${employee.first_name},\n\n` +
      `Great news! Your profile changes have been **reviewed and approved** by the ${approverRole}.\n` +
      `The updated information is now live in the system.\n\n` +
      `You can view your profile here: ${process.env.FRONTEND_URL || 'http://localhost:3002'}/profile\n\n` +
      `Thank you for keeping your information up to date!\n\n` +
      `Best regards,\n${approverTeam}`
    );

    return res.json({ message: 'Profile successfully updated' });
  } catch (err) {
    console.error('[finalDecision] Error:', err);
    return res.status(500).json({ message: 'Server error during final approval' });
  }
};

const getRequestStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const employee = await Employee.findOne({
      where: { user_id: userId },
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Look for the most recent relevant request that is still "in progress"
    const latestRequest = await ProfileEditRequest.findOne({
      where: {
        employee_id: employee.employee_id,
        status: {
          [Op.in]: [
            'pending_initial',
            'approved_initial',
            'pending_final',
          ],
        },
      },
      order: [['created_at', 'DESC']],
    });

    if (!latestRequest) {
      return res.json({
        hasPending: false,
        status: null,
      });
    }

    return res.json({
      hasPending: true,
      status: latestRequest.status,
      requestId: latestRequest.id,
    });
  } catch (err) {
    console.error('[getRequestStatus] Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  requestProfileUpdate,
  reviewInitialRequest,
  submitEditedProfile,
  finalDecision,
  getRequestStatus,
};