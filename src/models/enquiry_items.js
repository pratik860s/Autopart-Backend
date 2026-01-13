const { DataTypes } = require("sequelize");
const { getSequelize } = require("../configs/db");

const sequelize = getSequelize();;

const EnquiryItems = sequelize.define(
  "enquiry_items",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    enquiry_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "enquiries",
        key: "id",
      },
    },
    product_type_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: "product_type",
        key: "id",
      },
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("open", "completed", "cancelled"),
      defaultValue: "open",
    },
    image: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "enquiry_items",
    timestamps: false,
    underscored: true,
  }
);

module.exports = EnquiryItems;
