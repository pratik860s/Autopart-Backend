const { DataTypes } = require("sequelize");
const sequelize = require("../configs/db").sequelize;

// Define the ContactData model
const ContactData = sequelize.define(
  "ContactData",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "contact_data",
    timestamps: false,
  }
);

module.exports = ContactData;