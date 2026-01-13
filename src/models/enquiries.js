const { DataTypes } = require("sequelize");
const sequelize = require("../configs/db").sequelize;

const Enquiries = sequelize.define(
  "enquiries",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    buyer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    vehicle_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // image: {
    //   type: DataTypes.ARRAY(DataTypes.TEXT),
    //   allowNull: true,
    // },
    status: {
      type: DataTypes.ENUM("open", "completed", "cancelled"),
      defaultValue: "open",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "enquiries",
    timestamps: false,
    underscored: true,
  }
);

module.exports = Enquiries;
