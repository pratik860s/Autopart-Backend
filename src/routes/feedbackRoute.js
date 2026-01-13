const express = require("express");
const router = express.Router();
const {
  submitFeedback,
  getAllFeedback,
  updateFeedbackStatus,
  replyToFeedback,
  getFeedbackMessages,
} = require("../controllers/api/v1/feedbackController.js");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post(
  "/submit",
  verifyToken,
  upload.array("screenshot", 5),
  submitFeedback
);
router.get("/get-all-feedback", verifyToken, getAllFeedback);
router.post(
  "/:feedbackId/reply",
  verifyToken,
  upload.array("screenshot", 5),
  replyToFeedback
);
router.get("/:feedbackId/messages", verifyToken, getFeedbackMessages);
router.patch(
  "/update-status/:feedbackId",
  verifyToken,
  authorizeRoles("admin"),
  updateFeedbackStatus
);

module.exports = router;
