const { DataTypes } = require("sequelize");
const sequelize = require("../configs/db").sequelize;

const SellerProductTypeConfig = sequelize.define(
  "seller_product_type_config",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    seller_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    product_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "product_type",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "seller_product_type_config",
    timestamps: false,
    underscored: true,
  }
);

module.exports = SellerProductTypeConfig;
