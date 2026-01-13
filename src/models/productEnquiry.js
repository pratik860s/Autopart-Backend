const { DataTypes } = require("sequelize");
const { getSequelize } = require("../configs/db");

const sequelize = getSequelize();;

const ProductEnquiry = sequelize.define(
  "productEnquiry",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    image_url: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "productEnquiry",
    timestamps: true, // Set to true if you want createdAt/updatedAt fields
    underscored: true,
  }
);

module.exports = ProductEnquiry;
