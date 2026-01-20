'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('employees', 'username', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('employees', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });

    await queryInterface.addColumn('employees', 'updated_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    });

    await queryInterface.addColumn('employees', 'created_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    });
  },
  

  down: async (queryInterface) => {
    await queryInterface.removeColumn('employees', 'username');
    await queryInterface.removeColumn('employees', 'updated_at');
    await queryInterface.removeColumn('employees', 'updated_by');
    await queryInterface.removeColumn('employees', 'created_by');
  },
};