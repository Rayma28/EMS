const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Employee = sequelize.define('Employee', {
  employee_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  first_name: {
    type: DataTypes.STRING(100),
  },
  last_name: {
    type: DataTypes.STRING(100),
  },
  dob: {
    type: DataTypes.DATEONLY,
  },
  gender: {
    type: DataTypes.STRING(20),
  },
  phone: {
    type: DataTypes.STRING(15),
  },
  address: {
    type: DataTypes.TEXT,
  },
  joining_date: {
    type: DataTypes.DATEONLY,
  },
  department_id: {
    type: DataTypes.INTEGER,
  },
  designation: {
    type: DataTypes.STRING(100),
  },
  salary: {
    type: DataTypes.NUMERIC(10, 2),
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'Active',
  },
  documents: {
    type: DataTypes.TEXT,
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  is_experienced: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
  allowNull: false,
  },
  previous_company: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  previous_company: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  previous_salary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  next_increment: {
  type: DataTypes.DATEONLY,
  allowNull: true,
  comment: 'Next salary increment date',
  },
}, {
  tableName: 'employees',
  timestamps: false,
});

module.exports = Employee;