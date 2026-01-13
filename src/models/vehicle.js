const { DataTypes } = require("sequelize");
const sequelize = require("../configs/db").sequelize;

const Vehicle = sequelize.define(
  "vehicle",
  {
    id: {
      // <-- Add this block
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    make: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    body_style: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    trim: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gearbox: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fuel: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "vehicle",
    timestamps: false,
    underscored: true,
  }
);

module.exports = Vehicle;
