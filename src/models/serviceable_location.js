// src/models/serviceable_location.js
const { DataTypes } = require("sequelize");
const { getSequelize } = require("../configs/db");

const sequelize = getSequelize();;

const Serviceable_location = sequelize.define(
  "serviceable_location",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    serviceable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "serviceable_locations",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Serviceable_location;
