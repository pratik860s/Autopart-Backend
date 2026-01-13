const { DataTypes } = require("sequelize");
const sequelize = require("../configs/db").sequelize;

const ProductType = sequelize.define(
  "product_type",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    tableName: "product_type",
    timestamps: false,
    underscored: true,
  }
);

module.exports = ProductType;
