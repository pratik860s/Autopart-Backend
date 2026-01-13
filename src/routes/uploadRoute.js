const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const { uploadToS3 } = require("../services/s3Service");

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const url = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      process.env.S3_BUCKET_NAME
    );
    res.json({ url });
  } catch (err) {
    console.error("S3 upload error:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

module.exports = router;
