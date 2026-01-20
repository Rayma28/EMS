'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payroll', {
      payroll_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'employee_id',
        },
        onDelete: 'CASCADE',
      },
      month: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      basic_salary: {
        type: Sequelize.NUMERIC(10, 2),
        allowNull: true,
      },
      bonus: {
        type: Sequelize.NUMERIC(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      deductions: {
        type: Sequelize.NUMERIC(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      net_salary: {
        type: Sequelize.NUMERIC(10, 2),
        allowNull: true,
      },
      payment_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('payroll');
  },
};