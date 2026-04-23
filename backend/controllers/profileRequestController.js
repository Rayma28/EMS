// backend/controllers/profileRequestController.js
const { Employee, User, ProfileEditRequest } = require('../models');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../utils/email');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'fc024c26dbaa64992128f0a01a96615b2986f9bb09d6a32710103f9e1c358c61';

// ────────────────────────────────────────────────
//  Email styling helpers
// ────────────────────────────────────────────────
const buttonStyle = (bgColor) => `
  display:inline-block;
  background-color:${bgColor};
  color:#ffffff !important;
  font-family:Arial,Helvetica,sans-serif;
  font-size:16px;
  font-weight:bold;
  text-decoration:none;
  padding:14px 32px;
  border-radius:6px;
  line-height:1;
  box-shadow:0 2px 4px rgba(0,0,0,0.1);
`;

const emailContainer = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;color:#333;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f4f6f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding:28px 40px;background:#1976d2;color:white;text-align:center;">
              <h2 style="margin:0;font-size:24px;">{TITLE}</h2>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:36px 48px;font-size:16px;line-height:1.6;">
              {CONTENT}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px;background:#f8f9fa;font-size:13px;color:#555;text-align:center;border-top:1px solid #e0e0e0;">
              This is an automated message from your HR system.<br>
              Please do not reply directly to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const wrapEmail = (title, content) => {
  return emailContainer
    .replace('{TITLE}', title)
    .replace('{CONTENT}', content);
};

// ────────────────────────────────────────────────
//  Token helpers
// ────────────────────────────────────────────────
const generateActionToken = (requestId, intent, type) => {
  return jwt.sign(
    { requestId: Number(requestId), intent, type },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ────────────────────────────────────────────────
//  1. Employee → Submit initial request
// ────────────────────────────────────────────────
const requestProfileUpdate = async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findOne({
      where: { user_id: userId },
      include: [{ model: User, attributes: ['email', 'username', 'role'] }],
    });

    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

    const changes = req.body.changes || {};
    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ message: 'No changes provided' });
    }

    const approverRole = employee.User.role === 'HR' ? 'Admin' : 'HR';

    const requestRecord = await ProfileEditRequest.create({
      employee_id: employee.employee_id,
      requested_by: userId,
      requested_changes: changes,
      status: 'pending_initial',
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const approveToken = generateActionToken(requestRecord.id, 'approve', 'initial');
    const rejectToken  = generateActionToken(requestRecord.id, 'reject',  'initial');

    await requestRecord.update({
      action_token_approve: approveToken,
      action_token_reject: rejectToken,
      action_token_expires_at: expiresAt,
    });

    const approvers = await User.findAll({ where: { role: approverRole } });
    const approverEmails = approvers.map(u => u.email).filter(Boolean);

    if (approverEmails.length > 0) {
      const baseUrl = 'http://localhost:5002';
      const approveLink = `${baseUrl}/api/profile/profile-request/action/${approveToken}`;
      const rejectLink  = `${baseUrl}/api/profile/profile-request/action/${rejectToken}`;
      const reviewLink  = `${baseUrl}/${approverRole.toLowerCase()}/profile-request`;

      const content = `
        <p style="margin:0 0 20px;">Employee <strong>${employee.first_name} ${employee.last_name}</strong> 
          has submitted a profile update request.
        </p>

        <p style="margin:0 0 8px;font-weight:bold;">Request ID: ${requestRecord.id}</p>

        <div style="margin:0 0 28px; line-height:1.6; font-size:15px;">
          <strong>Requester Details:</strong><br>
          <strong>Name:</strong> ${employee.first_name} ${employee.last_name}<br>
          <strong>Email:</strong> ${employee.User?.email || 'Not provided'}<br>
          ${employee.phone ? `<strong>Phone:</strong> ${employee.phone}<br>` : ''}
          <strong>Employee ID:</strong> ${employee.employee_id}
        </div>

        <p style="margin:0 0 24px;">Please review and take action:</p>

        <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:32px 0;">
          <tr>
            <td style="padding-right:20px;">
              <a href="${approveLink}" target="_blank" rel="noopener" style="${buttonStyle('#4CAF50')}">Approve</a>
            </td>
            <td>
              <a href="${rejectLink}" target="_blank" rel="noopener" style="${buttonStyle('#f44336')}">Reject</a>
            </td>
          </tr>
        </table>

        <p style="margin:32px 0 0;font-size:14px;color:#555;">
          Buttons don't work? Review here:<br>
          <a href="${reviewLink}" style="color:#1976d2;">${reviewLink}</a>
        </p>
      `;

      await sendEmail(
        approverEmails.join(', '),
        'New Profile Update Request – Action Required',
        wrapEmail('Profile Update Request – Action Required', content),
        true
      );
    }

    return res.status(201).json({
      message: 'Profile update request sent for review',
      requestId: requestRecord.id,
    });
  } catch (err) {
    console.error('[requestProfileUpdate]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ────────────────────────────────────────────────
//  2. Initial review (from UI)
// ────────────────────────────────────────────────
const reviewInitialRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, comment } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "approve" or "reject"' });
    }

    const record = await ProfileEditRequest.findByPk(requestId);
    if (!record) return res.status(404).json({ message: 'Request not found' });
    if (record.status !== 'pending_initial') {
      return res.status(400).json({ message: `Invalid state: ${record.status}` });
    }

    const employee = await Employee.findByPk(record.employee_id, {
      include: [{ model: User, attributes: ['email', 'role'] }],
    });

    if (!employee?.User?.email) {
      return res.status(400).json({ message: 'Employee email missing' });
    }

    const approverRole = employee.User.role === 'HR' ? 'Admin' : 'HR';
    const approverTeam = `${approverRole} Team`;

    if (action === 'reject') {
      await record.update({
        status: 'rejected',
        hr_comment: comment?.trim() || 'No reason provided',
        action_token_used: true,
      });

      const content = `
        <p>Dear ${employee.first_name},</p>
        <p>Your request to update profile information has been <strong>rejected</strong> by the ${approverRole}.</p>
        <p><strong>Reason:</strong> ${comment?.trim() || 'No reason provided'}</p>
        <p>If you believe this was in error, please contact the ${approverRole} team.</p>
        <p style="margin-top:32px;">Thank you,<br>${approverTeam}</p>
      `;

      await sendEmail(
        employee.User.email,
        'Profile Update Request Rejected',
        wrapEmail('Profile Update Request Rejected', content),
        true
      );

      return res.json({ message: 'Request rejected' });
    }

    // Approve → send secure edit link
    const editToken = jwt.sign(
      { requestId: record.id, employeeId: employee.employee_id, purpose: 'profile_edit' },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    const editLink = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/profile/profile/edit/${editToken}`;
    await record.update({
      status: 'approved_initial',
      token: editToken,
      token_expires_at: new Date(Date.now() + 30 * 60 * 1000),
      hr_comment: comment?.trim() || null,
      action_token_used: true,
    });

    const content = `
      <p>Dear ${employee.first_name},</p>
      <p>Good news! Your profile update request has been <strong>approved</strong> by the ${approverRole}.</p>
      <p style="margin:20px 0 32px;">You can now review and submit your final changes using the link below:</p>

      <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 32px;">
        <tr>
          <td>
            <a href="${editLink}" target="_blank" rel="noopener" style="${buttonStyle('#4CAF50')}">Edit Profile Now</a>
          </td>
        </tr>
      </table>

      <p style="color:#d32f2f;font-size:0.95em;margin-bottom:32px;">
        • This link is valid for <strong>30 minutes</strong><br>
        • It can be used only once
      </p>

      <p style="margin:0 0 8px;font-weight:bold;">Request ID: ${record.id}</p>

      <div style="margin:0 0 32px; line-height:1.6;">
        <strong>Requester:</strong> ${employee.first_name} ${employee.last_name}<br>
        <strong>Email:</strong> ${employee.User?.email || 'Not provided'}<br>
        ${employee.phone ? `<strong>Phone:</strong> ${employee.phone}<br>` : ''}
        <strong>Employee ID:</strong> ${employee.employee_id}
      </div>

      ${comment ? `<p style="margin:24px 0 0;"><strong>${approverRole} note:</strong> ${comment.trim()}</p>` : ''}
      <p style="margin-top:40px;">Best regards,<br>${approverTeam}</p>
    `;

    await sendEmail(
      employee.User.email,
      'Profile Update Request Approved – Edit Now',
      wrapEmail('Profile Update Request Approved', content),
      true
    );

    return res.json({ message: 'Initial approval granted. Edit link sent.' });
  } catch (err) {
    console.error('[reviewInitialRequest]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ────────────────────────────────────────────────
//  3. Employee submits final changes
// ────────────────────────────────────────────────
const submitEditedProfile = async (req, res) => {
  try {
    const { token } = req.params;
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid or expired link' });
    }

    const record = await ProfileEditRequest.findByPk(payload.requestId);
    if (!record) return res.status(404).json({ message: 'Request not found' });

    if (record.status !== 'approved_initial') {
      return res.status(400).json({ message: `Cannot edit in state: ${record.status}` });
    }

    if (new Date() > record.token_expires_at) {
      await record.update({ status: 'rejected' });
      return res.status(410).json({ message: 'Edit link expired' });
    }

    const submittedChanges = req.body.changes || {};
    if (Object.keys(submittedChanges).length === 0) {
      return res.status(400).json({ message: 'No changes submitted' });
    }

    await record.update({
      changes_submitted: submittedChanges,
      status: 'pending_final',
      token: null,
      token_expires_at: null,
    });

    const employee = await Employee.findByPk(record.employee_id, {
      include: [{ model: User, attributes: ['email', 'role'] }],
    });

    const approverRole = employee.User.role === 'HR' ? 'Admin' : 'HR';
    const approvers = await User.findAll({ where: { role: approverRole } });
    const approverEmails = approvers.map(u => u.email).filter(Boolean);

    if (approverEmails.length > 0) {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
      const reviewLink = `${baseUrl}/${approverRole.toLowerCase()}/profile-request`;

      const content = `
        <p>Employee has submitted <strong>final changes</strong> for approval.</p>
        <p style="margin:20px 0 28px;font-weight:bold;">Request ID: ${record.id}</p>
        <p>Please review and make final decision:</p>

        <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:32px 0;">
          <tr>
            <td>
              <a href="${reviewLink}" target="_blank" rel="noopener" style="${buttonStyle('#1976d2')}">Review in Portal</a>
            </td>
          </tr>
        </table>

        <p style="margin:32px 0 0;font-size:14px;color:#555;">
          If the button doesn't work, copy-paste this link:<br>
          <a href="${reviewLink}" style="color:#1976d2; word-break:break-all;">${reviewLink}</a>
        </p>
      `;

      await sendEmail(
        approverEmails.join(', '),
        'Final Profile Changes Submitted – Action Required',
        wrapEmail('Final Profile Changes – Review Needed', content),
        true
      );
    }

    return res.json({
      success: true,
      message: 'Changes submitted. Awaiting final approval.',
    });
  } catch (err) {
    console.error('[submitEditedProfile]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ────────────────────────────────────────────────
//  4. Final decision (from UI)
// ────────────────────────────────────────────────
const finalDecision = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, comment } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "approve" or "reject"' });
    }

    const record = await ProfileEditRequest.findByPk(requestId);
    if (!record) return res.status(404).json({ message: 'Request not found' });
    if (record.status !== 'pending_final') {
      return res.status(400).json({ message: `Invalid state: ${record.status}` });
    }

    const employee = await Employee.findByPk(record.employee_id, {
      include: [{ model: User, attributes: ['id', 'email', 'role'] }],
    });

    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    if (!employee.User?.email) return res.status(400).json({ message: 'Employee email missing' });

    const approverRole = employee.User.role === 'HR' ? 'Admin' : 'HR';
    const approverTeam = `${approverRole} Team`;

    if (action === 'reject') {
      await record.update({
        status: 'rejected',
        final_comment: comment?.trim() || 'No reason provided',
        action_token_used: true,
      });

      const content = `
        <p>Dear ${employee.first_name},</p>
        <p>After final review, the ${approverRole} has decided <strong>not to apply</strong> the submitted changes.</p>
        <p><strong>Reason:</strong> ${comment?.trim() || 'No reason provided'}</p>
        <p>If you have questions, please contact the ${approverRole} team.</p>
        <p style="margin-top:32px;">Thank you,<br>${approverTeam}</p>
      `;

      await sendEmail(
        employee.User.email,
        'Final Profile Update – Rejected',
        wrapEmail('Final Profile Update Rejected', content),
        true
      );

      return res.json({ message: 'Final rejection completed' });
    }

    // ─── APPROVE ───
    const changes = record.changes_submitted || {};

    // 1. Update Employee fields
    await employee.update({
      first_name: changes.first_name ?? employee.first_name,
      last_name: changes.last_name ?? employee.last_name,
      phone: changes.phone !== undefined ? changes.phone : employee.phone,
      gender: changes.gender ?? employee.gender,
      dob: changes.dob ?? employee.dob,
      pan_number: changes.pan_number ?? employee.pan_number,
      aadhaar_number: changes.aadhaar_number ?? employee.aadhaar_number,
    });

    // 2. Update email in User table if changed 
    let newEmailUsed = employee.User.email;
    if (changes.email && changes.email.trim() !== employee.User.email) {
      const trimmedEmail = changes.email.trim();

      // Check uniqueness
      const existingUser = await User.findOne({ 
        where: { email: trimmedEmail },
      });

      if (existingUser && existingUser.id !== employee.User.id) {
        return res.status(409).json({ message: 'Email address already in use by another account' });
      }

      await employee.User.update({ email: trimmedEmail });
      newEmailUsed = trimmedEmail;
    }

    await record.update({
      status: 'approved_final',
      final_comment: comment?.trim() || 'Final approval granted',
      action_token_used: true,
    });

    const profileLink = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/profile`;

    const content = `
      <p>Dear ${employee.first_name},</p>
      <p>Great news! Your profile changes have been <strong>reviewed and approved</strong> by the ${approverRole}.</p>
      <p>The updated information is now live in the system.</p>
      ${
        changes.email && changes.email.trim() !== employee.User.email
          ? `<p><strong>Important:</strong> Your login email has been updated to <strong>${newEmailUsed}</strong>.<br>Please use this email for future logins.</p>`
          : ''
      }

      <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:32px 0;">
        <tr>
          <td>
            <a href="${profileLink}" target="_blank" rel="noopener" style="${buttonStyle('#1976d2')}">View Your Profile</a>
          </td>
        </tr>
      </table>

      <p style="margin-top:32px;">Thank you for keeping your information up to date!<br>Best regards,<br>${approverTeam}</p>
    `;

    await sendEmail(
      newEmailUsed,  // Use new email if changed, otherwise old one
      'Profile Successfully Updated',
      wrapEmail('Profile Successfully Updated', content),
      true
    );

    return res.json({ message: 'Profile successfully updated' });
  } catch (err) {
    console.error('[finalDecision]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const handleQuickAction = async (req, res) => {
  const { token } = req.params;

  try {
    const { requestId, intent, type } = jwt.verify(token, JWT_SECRET);
    const record = await ProfileEditRequest.findByPk(requestId);

    if (!record) {
      return res.status(404).send('<h2 style="color:#d32f2f;">Request not found</h2>');
    }

    if (record.action_token_used) {
      return res.send('<h2 style="color:#d32f2f;">This link has already been used.</h2>');
    }

    if (new Date() > record.action_token_expires_at) {
      return res.send('<h2 style="color:#d32f2f;">This link has expired.</h2>');
    }

    const employee = await Employee.findByPk(record.employee_id, {
      include: [{ model: User, attributes: ['id', 'email', 'role'] }],
    });

    if (!employee) {
      return res.send('<h2 style="color:#d32f2f;">Employee record not found</h2>');
    }

    let message = '';

    if (intent === 'approve') {
      if (type === 'initial') {
        if (!employee?.User?.email) {
          return res.send('<h2 style="color:#d32f2f;">Cannot proceed – employee email missing</h2>');
        }

        const editToken = jwt.sign(
          { requestId, employeeId: employee.employee_id, purpose: 'profile_edit' },
          JWT_SECRET,
          { expiresIn: '30m' }
        );

        const editLink = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/profile/profile/edit/${editToken}`;

        await record.update({
          status: 'approved_initial',
          token: editToken,
          token_expires_at: new Date(Date.now() + 30 * 60 * 1000),
          action_token_used: true,
        });

        const content = `
          <p>Your request has been <strong>approved</strong> via quick action.</p>
          <p style="margin:24px 0;">You may now edit your profile:</p>
          <a href="${editLink}" style="${buttonStyle('#4CAF50')}">Edit Profile Now</a>
          <p style="margin-top:24px;color:#d32f2f;">
            • Valid for 30 minutes<br>• Single use only
          </p>
        `;

        await sendEmail(
          employee.User.email,
          'Profile Update Approved – Edit Now',
          wrapEmail('Profile Update Approved', content),
          true
        );

        message = 'Initial approval completed. Edit link sent to employee.';
      } 
      else if (type === 'final') {
        const changes = record.changes_submitted || {};

        // Update Employee fields
        await employee.update({
          first_name: changes.first_name ?? employee.first_name,
          last_name: changes.last_name ?? employee.last_name,
          phone: changes.phone !== undefined ? changes.phone : employee.phone,
          gender: changes.gender ?? employee.gender,
          dob: changes.dob ?? employee.dob,
          pan_number: changes.pan_number ?? employee.pan_number,
          aadhaar_number: changes.aadhaar_number ?? employee.aadhaar_number,
        });

        // Update email in User table if changed (onl)
        let finalEmail = employee.User.email;
        if (changes.email && changes.email.trim() !== employee.User.email) {
          const newEmail = changes.email.trim();

          // Optional: prevent duplicate email 
          const duplicate = await User.findOne({ where: { email: newEmail } });
          if (duplicate && duplicate.id !== employee.User.id) {
            return res.send('<h2 style="color:#d32f2f;">Cannot apply – email already in use</h2>');
          }

          await employee.User.update({ email: newEmail });
          finalEmail = newEmail;
        }

        await record.update({
          status: 'approved_final',
          final_comment: 'Approved via quick action',
          action_token_used: true,
        });

        const content = `
          <p>Your profile changes were <strong>approved</strong> via quick action link.</p>
          <p>The updates are now live in the system.</p>
          ${
            changes.email && changes.email.trim() !== employee.User.email
              ? `<p><strong>Note:</strong> Your login email is now <strong>${finalEmail}</strong></p>`
              : ''
          }
        `;

        await sendEmail(
          finalEmail,
          'Profile Successfully Updated',
          wrapEmail('Profile Successfully Updated', content),
          true
        );

        message = 'Final approval completed. Changes applied.';
      }
    } 
    else if (intent === 'reject') {
      const reason = 'Rejected via quick action link';

      if (type === 'initial') {
        await record.update({
          status: 'rejected',
          hr_comment: reason,
          action_token_used: true,
        });
      } else {
        await record.update({
          status: 'rejected',
          final_comment: reason,
          action_token_used: true,
        });
      }

      if (employee?.User?.email) {
        const content = `
          <p>Your request was <strong>rejected</strong> via quick action link.</p>
          <p>Reason: ${reason}</p>
        `;
        await sendEmail(
          employee.User.email,
          'Profile Request Rejected',
          wrapEmail('Profile Request Rejected', content),
          true
        );
      }

      message = `Request rejected (${type} review).`;
    }

    // Success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Action Completed</title></head>
      <body style="font-family:Arial,sans-serif;text-align:center;padding:100px 20px;background:#f8f9fa;">
        <h1 style="color:#4CAF50;">Action Completed</h1>
        <p style="font-size:18px;margin:24px 0;color:#333;">${message}</p>
        <p style="color:#666;">You can now safely close this window.</p>
        <script>setTimeout(() => window.close(), 7000);</script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('[Quick Action]', err);
    let msg = 'Invalid or expired action link.';
    if (err.name === 'TokenExpiredError') msg = 'This action link has expired.';
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Action Failed</title></head>
      <body style="font-family:Arial,sans-serif;text-align:center;padding:100px 20px;background:#f8f9fa;">
        <h1 style="color:#d32f2f;">Action Failed</h1>
        <p style="font-size:18px;margin:24px 0;color:#333;">${msg}</p>
      </body>
      </html>
    `);
  }
};

//  Status check 
const getRequestStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findOne({ where: { user_id: userId } });

    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const latest = await ProfileEditRequest.findOne({
      where: {
        employee_id: employee.employee_id,
        status: { [Op.in]: ['pending_initial', 'approved_initial', 'pending_final'] },
      },
      order: [['created_at', 'DESC']],
    });

    if (!latest) {
      return res.json({ hasPending: false, status: null });
    }

    return res.json({
      hasPending: true,
      status: latest.status,
      requestId: latest.id,
    });
  } catch (err) {
    console.error('[getRequestStatus]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  requestProfileUpdate,
  reviewInitialRequest,
  submitEditedProfile,
  finalDecision,
  handleQuickAction,
  getRequestStatus,
};