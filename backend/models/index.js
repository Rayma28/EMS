const sequelize = require('../config/database');
const User = require('./user');
const Employee = require('./employee');
const Department = require('./department');
const Attendance = require('./attendance');
const LeaveRequest = require('./leaveRequest');
const Payroll = require('./payroll');
const PerformanceReview = require('./performanceReview');
const Request = require('./Request');  

// Associations
User.hasOne(Employee, { foreignKey: 'user_id' });
Employee.belongsTo(User, { foreignKey: 'user_id' });

Employee.belongsTo(Department, { foreignKey: 'department_id' });
Department.hasMany(Employee, { foreignKey: 'department_id' });

Attendance.belongsTo(Employee, { foreignKey: 'employee_id' });
Employee.hasMany(Attendance, { foreignKey: 'employee_id' });

LeaveRequest.belongsTo(Employee, { foreignKey: 'employee_id' });
Employee.hasMany(LeaveRequest, { foreignKey: 'employee_id' });

Payroll.belongsTo(Employee, { foreignKey: 'employee_id' });
Employee.hasMany(Payroll, { foreignKey: 'employee_id' });

PerformanceReview.belongsTo(Employee, { foreignKey: 'employee_id' });
Employee.hasMany(PerformanceReview, { foreignKey: 'employee_id' });

PerformanceReview.belongsTo(User, { foreignKey: 'reviewer_id', as: 'Reviewer' });

Request.belongsTo(User, { 
  foreignKey: 'requester_id', 
  as: 'Requester' 
});

User.hasMany(Request, { 
  foreignKey: 'requester_id', 
  as: 'Requests' 
});

Request.belongsTo(User, { 
  foreignKey: 'manager_approved_by', 
  as: 'ManagerApprover' 
});

Request.belongsTo(User, { 
  foreignKey: 'admin_approved_by', 
  as: 'AdminApprover' 
});

Request.belongsTo(Employee, {
  foreignKey: 'requester_id',
  targetKey: 'user_id',
  as: 'EmployeeRequester'
});

Employee.hasMany(Request, {
  foreignKey: 'requester_id',
  sourceKey: 'user_id',
  as: 'EmployeeRequests'
});

module.exports = {
  sequelize,
  User,
  Employee,
  Department,
  Attendance,
  LeaveRequest,
  Payroll,
  PerformanceReview,
  Request,         
};