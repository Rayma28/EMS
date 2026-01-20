const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SuperUser = sequelize.define('SuperUser', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'super_users',
  timestamps: false,
});

module.exports = SuperUser;