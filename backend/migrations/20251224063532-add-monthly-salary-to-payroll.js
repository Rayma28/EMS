'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'payroll';
    await queryInterface.addColumn(tableName, 'monthly_salary', {
      type: Sequelize.DECIMAL(10, 2),   
      allowNull: false,
      defaultValue: 0.00,
    });

    await queryInterface.sequelize.query(`
      UPDATE ${tableName}
      SET monthly_salary = basic_salary / 12
      WHERE basic_salary IS NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(tableName, 'monthly_salary');
  }
};