const express = require("express");
const router = express.Router();
const chatController = require("../controllers/api/v1/chatController");
const { verifyToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.get("/users", verifyToken, chatController.getUsersForSidebar);
router.get("/:id", verifyToken, chatController.getMessages);
router.post(
  "/send/:id",
  verifyToken,
  upload.array("images", 5),
  chatController.sendMessage
);

module.exports = router;
