// backend/controllers/leaveController.js
const { LeaveRequest, Employee, User } = require('../models');
const { Op } = require('sequelize'); 
const dayjs = require('dayjs');     
const { sendEmail } = require('../utils/email');

const getLeaves = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const queryOptions = {
      include: [
        {
          model: Employee,
          include: [User],
        },
      ],
    };

    if (role === 'Employee') {
      const employee = await Employee.findOne({
        where: { user_id: userId },
        attributes: ['employee_id'],
      });

      if (!employee) {
        return res.status(404).json({ message: 'Employee profile not found' });
      }

      queryOptions.where = { employee_id: employee.employee_id };
    } 
    else if (role === 'Manager') {
      queryOptions.where = {
        [Op.or]: [
          { '$Employee.User.role$': 'Employee' },
          { '$Employee.User.role$': 'Manager' }
        ]
      };
    }

    const leaves = await LeaveRequest.findAll(queryOptions);

    res.json(leaves);
  } catch (err) {
    console.error('getLeaves error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const applyLeave = async (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body;

  if (!leave_type || !start_date || !end_date || !reason) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const userId = req.user.id;
    const employee = await Employee.findOne({
      where: { user_id: userId },
      include: [User],
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    const leave = await LeaveRequest.create({
      employee_id: employee.employee_id,
      leave_type,
      start_date,
      end_date,
      reason,
      status: 'Pending',
    });

    if (employee.User?.email) {
      sendEmail(
        employee.User.email,
        'Leave Application Submitted',
        `Your leave request from ${start_date} to ${end_date} has been submitted and is pending approval.`
      );
    }

    res.status(201).json({ message: 'Leave applied successfully', leave });
  } catch (err) {
    console.error('applyLeave error:', err);
    res.status(500).json({ message: 'Failed to apply leave' });
  }
};

const canApproveOrReject = (requestingRole, leaveOwnerRole, isSelf) => {
  if (isSelf) return false;
  if (requestingRole === 'Admin' || requestingRole === 'Superuser') return true;
  if (requestingRole === 'HR') {
    return leaveOwnerRole === 'Employee' || leaveOwnerRole === 'Manager';
  }
  if (requestingRole === 'Manager') {
    return leaveOwnerRole === 'Employee';
  }
  return false;
};

const approveLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const leave = await LeaveRequest.findByPk(leaveId, {
      include: [{ model: Employee, include: [User] }],
    });

    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    const requestingUserId = req.user.id;
    const requestingRole = req.user.role;
    const leaveOwnerRole = leave.Employee?.User?.role;

    const isSelf = leave.Employee?.user_id === requestingUserId;

    if (!canApproveOrReject(requestingRole, leaveOwnerRole, isSelf)) {
      return res.status(403).json({ message: 'You are not authorized to approve this leave request' });
    }

    await leave.update({ status: 'Approved' });

    if (leave.Employee?.User?.email) {
      sendEmail(
        leave.Employee.User.email,
        'Leave Request Approved',
        `Your leave request from ${leave.start_date} to ${leave.end_date} has been APPROVED by a ${requestingRole}.`
      );
    }

    res.json({ message: 'Leave approved successfully', leave });
  } catch (err) {
    console.error('approveLeave error:', err);
    res.status(500).json({ message: 'Failed to approve leave' });
  }
};

const rejectLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const leave = await LeaveRequest.findByPk(leaveId, {
      include: [{ model: Employee, include: [User] }],
    });

    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    const requestingUserId = req.user.id;
    const requestingRole = req.user.role;
    const leaveOwnerRole = leave.Employee?.User?.role;

    const isSelf = leave.Employee?.user_id === requestingUserId;

    if (!canApproveOrReject(requestingRole, leaveOwnerRole, isSelf)) {
      return res.status(403).json({ message: 'You are not authorized to reject this leave request' });
    }

    await leave.update({ status: 'Rejected' });

    if (leave.Employee?.User?.email) {
      sendEmail(
        leave.Employee.User.email,
        'Leave Request Rejected',
        `Your leave request from ${leave.start_date} to ${leave.end_date} has been REJECTED by a ${requestingRole}.`
      );
    }

    res.json({ message: 'Leave rejected successfully', leave });
  } catch (err) {
    console.error('rejectLeave error:', err);
    res.status(500).json({ message: 'Failed to reject leave' });
  }
};

const deleteLeave = async (req, res) => {
  try {
    const leave = await LeaveRequest.findByPk(req.params.id);

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    await leave.destroy();

    res.json({ message: 'Leave request deleted successfully' });
  } catch (err) {
    console.error('deleteLeave error:', err);
    res.status(500).json({ message: 'Failed to delete leave request' });
  }
};

const getMonthlyLeaves = async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findOne({ where: { user_id: userId } });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const employee_id = employee.employee_id;
    const month = req.params.month; 

    const startDate = dayjs(`${month}-01`);
    const endDate = startDate.endOf('month');

    const approvedLeaves = await LeaveRequest.findAll({
      where: {
        employee_id,
        status: 'Approved',
        [Op.or]: [
          {
            start_date: {
              [Op.gte]: startDate.format('YYYY-MM-DD'),
              [Op.lte]: endDate.format('YYYY-MM-DD')
            }
          },
          {
            start_date: { [Op.lte]: endDate.format('YYYY-MM-DD') },
            end_date: { [Op.gte]: startDate.format('YYYY-MM-DD') }
          }
        ]
      },
      attributes: ['start_date', 'end_date'],
      order: [['start_date', 'ASC']]
    });

    const leaveDates = [];

    for (const leave of approvedLeaves) {
      let current = dayjs(leave.start_date);
      const leaveEnd = dayjs(leave.end_date || leave.start_date);

      while (!current.isAfter(leaveEnd, 'day')) {
        if (!current.isBefore(startDate, 'day') && !current.isAfter(endDate, 'day')) {
          leaveDates.push(current.format('YYYY-MM-DD'));
        }
        current = current.add(1, 'day');
      }
    }
    const uniqueLeaveDates = [...new Set(leaveDates)];

    res.json(uniqueLeaveDates);
  } catch (err) {
    console.error('getMonthlyLeaves error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getLeaves,
  applyLeave,
  approveLeave,
  rejectLeave,
  deleteLeave,
  getMonthlyLeaves 
};