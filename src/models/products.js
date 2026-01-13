// const { DataTypes } = require("sequelize");
// const { getSequelize } = require("../configs/db");

// const sequelize = getSequelize();;
// const User = require("./user");

// const Products = sequelize.define(
//   "products",
//   {
//     title: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     images: {
//       type: DataTypes.ARRAY(DataTypes.TEXT),
//       allowNull: true,
//     },
//     description: {
//       type: DataTypes.TEXT,
//       allowNull: true,
//     },
//     variant: {
//       type: DataTypes.TEXT,
//       allowNull: true,
//     },
//     quantity: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     userId: {
//       type: DataTypes.UUID,
//       allowNull: false,
//       references: {
//         model: User,
//         key: "id",
//       },
//       onUpdate: "CASCADE",
//       onDelete: "CASCADE",
//     },
//   },
//   {
//     tableName: "products",
//     timestamps: true,
//   }
// );

// module.exports = Products;

const { DataTypes } = require("sequelize");
const { getSequelize } = require("../configs/db");

const sequelize = getSequelize();;
const User = require("./user");

const Products = sequelize.define(
  "products",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    variant: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    price: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "USD",
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
  },
  {
    tableName: "products",
    timestamps: true, // Recommended to keep for createdAt/updatedAt
    underscored: true, // Ensures snake_case columns like `user_id`
  }
);
module.exports = Products;
