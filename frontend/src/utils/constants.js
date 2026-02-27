export const getMenuItems = (role) => {
  const menus = {
    Admin: ['Dashboard', 'Employees', 'Departments', 'Attendance', 'Leaves', 'Payroll', 
      'Performance', 'Reports', 'Requests', 'Profile Requests', 'Settings'],
    HR: ['Dashboard', 'Employees', 'Attendance', 'Leaves', 'Payroll', 'Reports', 'Profile Requests', 'Profile'],
    Manager: ['Dashboard', 'Attendance', 'Leaves', 'Performance', 'Requests', 'Profile'],
    Employee: ['Dashboard', 'Attendance', 'Leaves', 'Requests', 'Profile'],
    Superuser: ['Dashboard', 'Employees', 'Departments', 'Attendance', 'Leaves', 'Payroll', 
      'Performance', 'Reports', 'Requests', 'Settings', 'Users'],
  };
  return menus[role] || [];
};
