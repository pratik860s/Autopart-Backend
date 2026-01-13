const { DataTypes } = require("sequelize");
const { getSequelize } = require("../configs/db");

const sequelize = getSequelize();;

const EnquirySeller = sequelize.define(
  "enquiry_seller",
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
      onDelete: "CASCADE",
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
    status: {
      type: DataTypes.ENUM("pending", "accepted", "rejected"),
      defaultValue: "pending",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "enquiry_seller",
    timestamps: false,
    underscored: true,
  }
);

module.exports = EnquirySeller;
