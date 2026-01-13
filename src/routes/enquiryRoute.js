const express = require("express");
const {
  createEnquiry,
  respondToEnquiry,
  getMyEnquiries,
  getReceivedEnquiries,
  getEnquiryDetails,
  verifyResetToken,
  resetPassword,
} = require("../controllers/api/v1/enquiryController");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create", createEnquiry);
router.get("/verify-reset-token/:token", verifyResetToken);
router.post("/reset-password", resetPassword);
router.post(
  "/respond/:enquiryId",
  verifyToken,
  authorizeRoles("seller"),
  respondToEnquiry
);
router.get("/my", verifyToken, authorizeRoles("buyer"), getMyEnquiries);
router.get(
  "/received",
  verifyToken,
  authorizeRoles("seller"),
  getReceivedEnquiries
);
router.get("/:enquiryId", verifyToken, getEnquiryDetails);

module.exports = router;
