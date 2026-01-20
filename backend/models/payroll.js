const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payroll = sequelize.define('Payroll', {
  payroll_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  month: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  basic_salary: {
    type: DataTypes.NUMERIC(10, 2),
  },
  bonus: {
    type: DataTypes.NUMERIC(10, 2),
    defaultValue: 0,
  },
  deductions: {
    type: DataTypes.NUMERIC(10, 2),
    defaultValue: 0,
  },
  net_salary: {
    type: DataTypes.NUMERIC(10, 2),
  },
  payment_date: {
    type: DataTypes.DATEONLY,
  },
}, {
  tableName: 'payroll',
  timestamps: false,
});

module.exports = Payroll;