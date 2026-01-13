// src/models/feedback_message.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../configs/db");

const FeedbackMessage = sequelize.define(
  "feedback_message",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    feedback_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    screenshot_url: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    is_admin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "feedback_message",
    timestamps: false,
    underscored: true,
  }
);

module.exports = FeedbackMessage;
