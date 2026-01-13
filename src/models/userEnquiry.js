const { DataTypes } = require("sequelize");
const sequelize = require("../configs/db").sequelize;

const UserEnquiry = sequelize.define(
  "user_enquiry",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    phone: DataTypes.STRING,
  },
  {
    tableName: "user_enquiry",
    timestamps: false,
    underscored: true,
  }
);

module.exports = UserEnquiry;
