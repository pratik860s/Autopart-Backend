const express = require("express");
const {
  verifyProduct,
  getPendingProducts,
} = require("../controllers/api/v1/adminController");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const adminController = require("../controllers/api/v1/adminController");

const router = express.Router();

router.get(
  "/pending-products",
  // verifyToken,
  authorizeRoles("admin"),
  getPendingProducts
);

router.patch(
  "/verify-product/:productId",
  verifyToken,
  authorizeRoles("admin"),
  verifyProduct
);

// User Management Routes
router.get(
  "/users",
  verifyToken,
  authorizeRoles("admin"),
  adminController.getAllUsers
);
router.get(
  "/users/:userId",
  verifyToken,
  authorizeRoles("admin"),
  adminController.getUserDetails
);
router.patch(
  "/users/:userId/status",
  verifyToken,
  authorizeRoles("admin"),
  adminController.updateUserStatus
);
router.patch(
  "/users/:userId/verify",
  verifyToken,
  authorizeRoles("admin"),
  adminController.verifySeller
);

// Enquiry Management Routes
router.get(
  "/enquiries",
  verifyToken,
  authorizeRoles("admin"),
  adminController.getAllEnquiries
);
router.get(
  "/enquiries/:enquiryId",
  verifyToken,
  authorizeRoles("admin"),
  adminController.getEnquiryDetails
);
router.get("/conversations", adminController.getAllConversations);
// router.get(
//   "/conversations/:room_id/messages",
//   adminController.getMessagesByRoomId
// );
router.get(
  "/messages/between",
  adminController.getMessagesBetweenBuyerAndSeller
);

// Quotation Management Routes
router.get(
  "/quotations",
  verifyToken,
  authorizeRoles("admin"),
  adminController.getAllQuotations
);
router.get(
  "/quotations/:quotationId",
  verifyToken,
  authorizeRoles("admin"),
  adminController.getQuotationDetails
);
router.get(
  "/enquiries/:enquiryId/quotations",
  verifyToken,
  authorizeRoles("admin"),
  adminController.getQuotationsByEnquiry
);
router.patch(
  "/quotations/:quotationId/status",
  verifyToken,
  authorizeRoles("admin"),
  adminController.updateQuotationStatus
);

router.get(
  "/dashboard",
  verifyToken,
  authorizeRoles("admin"),
  adminController.getDashboardStats
);

module.exports = router;
