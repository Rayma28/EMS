'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('profile_edit_requests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'employees',           // table name (lowercase, as Sequelize uses)
          key: 'employee_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',            // or 'SET NULL' / 'RESTRICT' depending on your needs
      },
      requested_changes: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      token: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'expired'),
        defaultValue: 'pending',
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      hr_comment: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Optional: Add index on token for faster lookups
    await queryInterface.addIndex('profile_edit_requests', ['token'], {
      unique: true,
      name: 'profile_edit_requests_token_unique',
    });

    // Optional: Index on employee_id + status for common queries
    await queryInterface.addIndex('profile_edit_requests', ['employee_id', 'status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('profile_edit_requests');

    // await queryInterface.removeIndex('profile_edit_requests', 'profile_edit_requests_token_unique');
  }
};