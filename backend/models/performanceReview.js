const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PerformanceReview = sequelize.define('PerformanceReview', {
  review_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reviewer_id: {
    type: DataTypes.INTEGER,
  },
  rating: {
    type: DataTypes.INTEGER,
  },
  feedback: {
    type: DataTypes.TEXT,
  },
  review_date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  review_month: {
        type: DataTypes.STRING(7),      
        allowNull: false,                 
  },
}, {
  tableName: 'performance_reviews',
  timestamps: false,
});

module.exports = PerformanceReview;