const { DataTypes } = require("sequelize");
const { sequelize } = require("../configs/db");

const Feedback = sequelize.define(
  "feedback",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    // message: {
    //   type: DataTypes.TEXT,
    //   allowNull: false,
    // },
    // admin_message: {
    //   type: DataTypes.TEXT,
    //   allowNull: true,
    // },
    // screenshot_url: {
    //   type: DataTypes.ARRAY(DataTypes.STRING),
    //   allowNull: true,
    // },
    status: {
      type: DataTypes.ENUM("open", "resolved"),
      defaultValue: "open",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "feedback",
    timestamps: false,
    underscored: true,
  }
);

module.exports = Feedback;
