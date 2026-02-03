const { Request, User, Employee } = require('../models');
const { Op } = require('sequelize');

const getRequests = async (req, res) => {
  try {
    const currentUser = req.user;

    let where = {};

    if (currentUser.role === 'Employee') {
      where.requester_id = currentUser.id;
    } 
    else if (currentUser.role === 'Manager') {
      const employeeUsers = await User.findAll({
        where: { role: 'Employee' },
        attributes: ['id'],
      });
      const employeeUserIds = employeeUsers.map(u => u.id);

      where = {
        [Op.or]: [
          { requester_id: currentUser.id },
          { requester_id: { [Op.in]: employeeUserIds } },
        ],
      };
    }

    const requests = await Request.findAll({
      where,
      include: [
      {
        model: User,
        as: 'Requester',
        attributes: ['id', 'username', 'email', 'role'],
        required: false, 
        include: [
          {
          model: Employee,
          attributes: ['first_name', 'last_name'],
          required: false, 
          },
        ],
      },
        {
          model: User,
          as: 'ManagerApprover',
          attributes: ['username'],
        },
        {
          model: User,
          as: 'AdminApprover',
          attributes: ['username'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json(requests);
  } catch (err) {
    console.error('getRequests error:', err);
    res.status(500).json({ message: 'Failed to fetch requests', error: err.message });
  }
};

const createRequest = async (req, res) => {
  try {
    const { items, description } = req.body;
    const user = req.user;

    const initialStatus = user.role === 'Manager' ? 'Pending Admin' : 'Pending Manager';

    const request = await Request.create({
      requester_id: user.id,
      items,
      description,
      status: initialStatus,
    });

    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create request' });
  }
};

const managerApprove = async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.id, {
      include: [{ model: User, as: 'Requester' }],
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Prevent manager from approving own request
    if (request.requester_id === req.user.id) {
      return res.status(403).json({ message: 'Cannot approve your own request' });
    }

    if (request.status !== 'Pending Manager') {
      return res.status(400).json({ message: 'Request not in pending manager state' });
    }

    await request.update({
      status: 'Pending Admin',
      manager_approved: true,
      manager_approved_by: req.user.id,
      manager_approved_at: new Date(),
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve' });
  }
};

const managerReject = async (req, res) => {
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ message: 'Rejection reason required' });

  try {
    const request = await Request.findByPk(req.params.id, {
      include: [{ model: User, as: 'Requester' }],
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Prevent manager from rejecting own request
    if (request.requester_id === req.user.id) {
      return res.status(403).json({ message: 'Cannot reject your own request' });
    }

    if (request.status !== 'Pending Manager') {
      return res.status(400).json({ message: 'Invalid state or request not found' });
    }

    await request.update({
      status: 'Rejected',
      manager_approved: false,
      manager_reason: reason.trim(),
      manager_approved_by: req.user.id,
      manager_approved_at: new Date(),
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject' });
  }
};

// Admin approve & reject remain the same (admin can approve/reject anything)
const adminApprove = async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.id);
    if (!request || request.status !== 'Pending Admin') {
      return res.status(400).json({ message: 'Invalid state or request not found' });
    }

    await request.update({
      status: 'Approved',
      admin_approved: true,
      admin_approved_by: req.user.id,
      admin_approved_at: new Date(),
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve' });
  }
};

const adminReject = async (req, res) => {
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ message: 'Rejection reason required' });

  try {
    const request = await Request.findByPk(req.params.id);
    if (!request || request.status !== 'Pending Admin') {
      return res.status(400).json({ message: 'Invalid state or request not found' });
    }

    await request.update({
      status: 'Rejected',
      admin_approved: false,
      admin_reason: reason.trim(),
      admin_approved_by: req.user.id,
      admin_approved_at: new Date(),
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject' });
  }
};

const deleteRequest = async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const currentUser = req.user;
    const isCreator = request.requester_id === currentUser.id;
    const isAdmin   = currentUser.role === 'Admin' || currentUser.role === 'Superuser';

    // Admin/Superuser can always delete
    if (isAdmin) {
      await request.destroy();
      return res.json({ message: 'Request deleted successfully' });
    }

    // Employee & Manager restrictions
    const isEmployee = currentUser.role === 'Employee';
    const isManager  = currentUser.role === 'Manager';

    if (!isCreator || (!isEmployee && !isManager)) {
      return res.status(403).json({ message: 'You are not authorized to delete this request' });
    }

    // Status restrictions for Employee & Manager
    const isPendingManager = request.status === 'Pending Manager';
    const isPendingAdmin   = request.status === 'Pending Admin';

    if (isEmployee && !isPendingManager) {
      return res.status(400).json({
        message: 'Employees can only delete requests while Pending Manager',
      });
    }

    if (isManager && !isPendingAdmin) {
      return res.status(400).json({
        message: 'Managers can only delete requests while Pending Admin',
      });
    }

    await request.destroy();

    res.json({ message: 'Request deleted successfully' });
  } catch (err) {
    console.error('deleteRequest error:', err);
    res.status(500).json({ message: 'Failed to delete request', error: err.message });
  }
};

const updateRequest = async (req, res) => {
  try {
    const { items, description } = req.body;
    const request = await Request.findByPk(req.params.id);

    if (!request) return res.status(404).json({ message: 'Request not found' });

    const currentUser = req.user;
    const isCreator = request.requester_id === currentUser.id;
    const isManager = currentUser.role === 'Manager';
    const isAdmin  = currentUser.role === 'Admin' || currentUser.role === 'Superuser';

    // Who can edit
    const canEdit =
      (isCreator && (currentUser.role === 'Employee' || currentUser.role === 'Manager')) ||
      isAdmin;

    if (!canEdit) {
      return res.status(403).json({ message: 'You are not authorized to edit this request' });
    }

    // Status restrictions
    const isPendingManager = request.status === 'Pending Manager';
    const isPendingAdmin   = request.status === 'Pending Admin';

    if (!isAdmin) {
      if (currentUser.role === 'Employee' && !isPendingManager) {
        return res.status(400).json({
          message: 'Employees can only edit requests while Pending Manager',
        });
      }
      if (currentUser.role === 'Manager' && !isPendingAdmin) {
        return res.status(400).json({
          message: 'Managers can only edit requests while Pending Admin',
        });
      }
    }

    await request.update({ items, description });

    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update request' });
  }
};

module.exports = {
  getRequests,
  createRequest,
  managerApprove,
  managerReject,
  adminApprove,
  adminReject,
  deleteRequest,   
  updateRequest,     
};