const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');   // ← import sequelize here

class Request extends Model {}

Request.init({
  request_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  requester_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  items: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Pending Manager', 'Pending Admin', 'Approved', 'Rejected'),
    allowNull: false,
    defaultValue: 'Pending Manager',
  },
  manager_approved:    { type: DataTypes.BOOLEAN, allowNull: true },
  manager_reason:      { type: DataTypes.TEXT,     allowNull: true },
  manager_approved_by: { type: DataTypes.INTEGER,  allowNull: true },
  manager_approved_at: { type: DataTypes.DATE,     allowNull: true },

  admin_approved:      { type: DataTypes.BOOLEAN, allowNull: true },
  admin_reason:        { type: DataTypes.TEXT,     allowNull: true },
  admin_approved_by:   { type: DataTypes.INTEGER,  allowNull: true },
  admin_approved_at:   { type: DataTypes.DATE,     allowNull: true },

  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'Request',
  tableName: 'requests',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Request;