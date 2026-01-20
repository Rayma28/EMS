'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('employees', ['user_id']);
    await queryInterface.addIndex('attendance', ['employee_id']);
    await queryInterface.addIndex('leave_requests', ['employee_id']);
    await queryInterface.addIndex('payroll', ['employee_id']);
    await queryInterface.addIndex('performance_reviews', ['employee_id']);
    await queryInterface.addIndex('performance_reviews', ['reviewer_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('employees', 'employees_user_id_idx');
    await queryInterface.removeIndex('attendance', 'attendance_employee_id_idx');
    await queryInterface.removeIndex('leave_requests', 'leave_requests_employee_id_idx');
    await queryInterface.removeIndex('payroll', 'payroll_employee_id_idx');
    await queryInterface.removeIndex('performance_reviews', 'performance_reviews_employee_id_idx');
    await queryInterface.removeIndex('performance_reviews', 'performance_reviews_reviewer_id_idx');
  },
};