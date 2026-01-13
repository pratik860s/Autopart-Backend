// vehicle_product_type_mapping.js
const { DataTypes } = require("sequelize");
const { getSequelize } = require("../configs/db");

const sequelize = getSequelize();;

const VehicleProductType = sequelize.define(
  "vehicle_product_type_mapping",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    vehicle_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "vehicle",
        key: "id",
      },
      onDelete: "CASCADE",
      primaryKey: true,
    },
    product_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "product_type",
        key: "id",
      },
      onDelete: "CASCADE",
      primaryKey: true,
    },
  },
  {
    tableName: "vehicle_product_type_mapping",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["vehicle_id", "product_type_id"],
      },
    ],
  }
);

module.exports = VehicleProductType;

// const { DataTypes } = require("sequelize");
// const { getSequelize } = require("../configs/db");

// const sequelize = getSequelize();;

// const VehicleProductType = sequelize.define(
//   "vehicle_product_type",
//   {
//     vehicle_id: {
//       type: DataTypes.INTEGER,
//       references: {
//         model: "vehicle",
//         key: "id",
//       },
//       onDelete: "CASCADE",
//     },
//     product_type_id: {
//       type: DataTypes.INTEGER,
//       references: {
//         model: "product_type",
//         key: "id",
//       },
//       onDelete: "CASCADE",
//     },
//   },
//   {
//     tableName: "vehicle_product_type",
//     timestamps: false,
//     underscored: true,
//   }
// );

// module.exports = VehicleProductType;
