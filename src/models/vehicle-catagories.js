const { DataTypes } = require("sequelize");
const sequelize = require("../configs/db").sequelize;
const VehicleCategories = sequelize.define(
  "vehicle-categories",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    categoryid: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    categoryname: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    parentcategory: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    categorytree: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    leafcategorytreenode: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "vehicle-categories",
    timestamps: false,
    underscored: true,
  }
);

module.exports = VehicleCategories;
