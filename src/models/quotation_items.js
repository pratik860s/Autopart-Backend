const { DataTypes } = require("sequelize");
const { getSequelize } = require("../configs/db");

const sequelize = getSequelize();;

const QuotationItems = sequelize.define(
  "quotation_items",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    quotation_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "quotations",
        key: "id",
      },
    },
    enquiry_item_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "enquiry_items",
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM("pending", "accepted", "rejected", "completed"),
      defaultValue: "pending",
    },
    quoted_price: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    delivery_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delivery_charges: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    condition: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    guarantee: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    invoice_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    subtotal: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    p_and_p: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    discount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    total_ex_vat: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    vat_percent: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    vat_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    grand_total: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    is_free_delivery: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_collection_only: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_vat_exempt: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    tableName: "quotation_items",
    timestamps: false,
    underscored: true,
  }
);

module.exports = QuotationItems;
