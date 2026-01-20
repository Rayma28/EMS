'use strict';

/** @type {import('sequelize').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('employees', 'next_increment', {
      type: Sequelize.DATEONLY,           
      allowNull: true,                    
      comment: 'Next salary increment date',
      defaultValue: null,
    });

    await queryInterface.addIndex('employees', ['next_increment']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('employees', ['next_increment']);
    await queryInterface.removeColumn('employees', 'next_increment');
  }
};