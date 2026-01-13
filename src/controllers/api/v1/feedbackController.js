const Feedback = require("../../../models/feedback");
const FeedbackMessage = require("../../../models/feedback_message");
const User = require("../../../models/user");
const { uploadToS3 } = require("../../../services/s3Service");

// Helper to handle screenshot uploads (array or files)
async function handleScreenshotUploads(req) {
  let screenshotUrlsFinal = [];
  const { screenshotUrls } = req.body;

  if (Array.isArray(screenshotUrls) && screenshotUrls.length > 0) {
    screenshotUrlsFinal = screenshotUrls;
  } else if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map((file) =>
      uploadToS3(file.buffer, file.originalname, process.env.S3_BUCKET_NAME)
    );
    screenshotUrlsFinal = await Promise.all(uploadPromises);
  } else if (req.file) {
    const url = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      process.env.S3_BUCKET_NAME
    );
    screenshotUrlsFinal.push(url);
  }
  return screenshotUrlsFinal;
}
exports.submitFeedback = async (req, res) => {
  try {
    const { message, screenshotUrls } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: "Feedback message is required" });
    }

    const screenshotUrlsFinal = await handleScreenshotUploads(req);

    // 1. Create the feedback entry first
    const feedback = await Feedback.create({
      user_id: userId,
    });
    // Create the first message
    await FeedbackMessage.create({
      feedback_id: feedback.id,
      sender_id: userId,
      message,
      screenshot_url:
        screenshotUrlsFinal.length > 0 ? screenshotUrlsFinal : null,
      is_admin: false,
    });

    res.status(201).json({
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// When replying to feedback (admin or user)
exports.replyToFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { message } = req.body;
    const isAdmin = req.user.type === "admin"; // Adjust as per your auth logic

    const feedback = await Feedback.findByPk(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    const screenshotUrlsFinal = await handleScreenshotUploads(req);

    const newMessage = await FeedbackMessage.create({
      feedback_id: feedbackId,
      sender_id: req.user.id,
      message,
      screenshot_url:
        screenshotUrlsFinal.length > 0 ? screenshotUrlsFinal : null,
      is_admin: isAdmin,
    });

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    console.error("Error replying to feedback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAllFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const userType = req.user.type;

    const whereClause = userType === "admin" ? {} : { user_id: userId };

    const feedbacks = await Feedback.findAndCountAll({
      where: whereClause,
      attributes: ["id", "status", "created_at"],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["created_at", "DESC"]],
      include: [
        {
          model: FeedbackMessage,
          as: "messages",
          attributes: [
            "id",
            "message",
            "screenshot_url",
            "is_admin",
            "created_at",
          ],
          order: [["created_at", "ASC"]],
          separate: true, // This ensures proper ordering of messages
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    res.status(200).json({
      status: "success",
      data: feedbacks.rows,
      total: feedbacks.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(feedbacks.count / limit),
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all messages for a feedback
exports.getFeedbackMessages = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const messages = await FeedbackMessage.findAll({
      where: { feedback_id: feedbackId },
      order: [["created_at", "ASC"]],
    });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("Error fetching feedback messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { status } = req.body;
    // Validate the status value
    if (!["open", "resolved"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    // Find the feedback by ID
    const feedback = await Feedback.findByPk(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    // Update the status
    feedback.status = status;
    await feedback.save();

    res
      .status(200)
      .json({ message: "Feedback status updated successfully", feedback });
  } catch (error) {
    console.error("Error updating feedback status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
