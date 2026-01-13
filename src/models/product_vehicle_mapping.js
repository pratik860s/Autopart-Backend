const { DataTypes } = require("sequelize");
const sequelize = require("../configs/db").sequelize;

const ProductVehicleMapping = sequelize.define(
  "ProductVehicleMapping",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "products",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    vehicle_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "vehicle",
        key: "id",
      },
      onDelete: "CASCADE",
    },
  },
  {
    tableName: "product_vehicle_mapping",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["product_id", "vehicle_id"],
      },
    ],
  }
);

module.exports = ProductVehicleMapping;
