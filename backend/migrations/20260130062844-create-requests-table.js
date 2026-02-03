'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('requests', {
      request_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      requester_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',           // assuming your users table is named 'users'
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      items: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Comma-separated or free text list of requested items',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          'Pending Manager',
          'Pending Admin',
          'Approved',
          'Rejected'
        ),
        allowNull: false,
        defaultValue: 'Pending Manager',
      },
      manager_approved: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: null,
      },
      manager_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      manager_approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      manager_approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      admin_approved: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: null,
      },
      admin_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      admin_approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      admin_approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('requests');
  }
};