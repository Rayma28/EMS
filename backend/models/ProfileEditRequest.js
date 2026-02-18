const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

  const ProfileEditRequest = sequelize.define('ProfileEditRequest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'employees', key: 'employee_id' },
    },
    requested_changes: {
      type: DataTypes.JSON,
      allowNull: false, 
    },
    token: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'expired'),
      defaultValue: 'pending',
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    hr_comment: DataTypes.TEXT,
  }, {
    tableName: 'profile_edit_requests',
    timestamps: true,
    underscored: true,
  });

module.exports = ProfileEditRequest;