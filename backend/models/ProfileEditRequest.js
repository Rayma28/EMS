// models/ProfileUpdateRequest.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProfileEditRequest = sequelize.define('ProfileEditRequest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'employees', key: 'employee_id' ,},
    },
    requested_by: {
      type: DataTypes.INTEGER,
      allowNull: false,                    
      references: {
        model: 'users',                    
        key: 'id',
      },
}   ,  
    status: {
      type: DataTypes.ENUM(
        'pending_initial',         
        'approved_initial',       
        'pending_final',     
        'approved_final',  
        'rejected',
        'expired'
      ),
      allowNull: false,
      defaultValue: 'pending_initial',
    },
    changes_requested: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},   
    },
    changes_submitted: {     
      type: DataTypes.JSON,
      allowNull: true,
    },
    hr_comment: DataTypes.TEXT,
    final_comment: DataTypes.TEXT,
    token: {                  
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  }, {
    tableName: 'profile_edit_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  ProfileEditRequest.associate = (models) => {
    ProfileEditRequest.belongsTo(models.Employee, {
      foreignKey: 'employee_id',
      as: 'employee',
    });
  };

  return ProfileEditRequest;
};