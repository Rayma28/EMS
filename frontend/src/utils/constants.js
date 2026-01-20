export const getMenuItems = (role) => {
  const menus = {
    Admin: ['Dashboard', 'Employees', 'Departments', 'Attendance', 'Leaves', 'Payroll', 
      'Performance', 'Reports', 'Profile', 'Settings'],
    HR: ['Dashboard', 'Employees', 'Attendance', 'Leaves', 'Payroll', 'Reports', 'Profile'],
    Manager: ['Dashboard', 'Attendance', 'Leaves', 'Performance', 'Profile'],
    Employee: ['Dashboard', 'Attendance', 'Leaves', 'Profile'],
    Superuser: ['Dashboard', 'Employees', 'Departments', 'Attendance', 'Leaves', 'Payroll', 
      'Performance', 'Reports', 'Profile', 'Settings', 'Users'],
  };
  return menus[role] || [];
};
