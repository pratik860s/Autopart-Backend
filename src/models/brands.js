const { DataTypes } = require("sequelize");
const { getSequelize } = require("../configs/db");

const sequelize = getSequelize();;

const Brand = sequelize.define(
  "brand",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "brand",
    timestamps: false,
    underscored: true,
  }
);

module.exports = Brand;
