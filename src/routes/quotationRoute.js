const express = require("express");
const {
  createQuotation,
  getQuotationsByEnquiry,
  updateQuotationItemStatus,
  negotiateQuotation,
  getQuotationDetailsByEnquiry,
  editQuotationItem,
  getQuotationsBySeller,
  sendQuotationEmail,
} = require("../controllers/api/v1/quotationController");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create", verifyToken, authorizeRoles("seller"), createQuotation);
router.get(
  "/by-enquiry/:enquiryId",
  verifyToken,
  authorizeRoles("buyer", "seller"),
  getQuotationsByEnquiry
);
router.get(
  "/details/by-enquiry/:enquiryId",
  verifyToken,
  authorizeRoles("buyer"),
  getQuotationDetailsByEnquiry
);
router.patch(
  "/item/:quotation_item_id/edit",
  verifyToken,
  authorizeRoles("seller"),
  editQuotationItem
);
router.patch(
  "/item/:quotation_item_id/status",
  verifyToken,
  updateQuotationItemStatus
);
router.patch(
  "/:quotationId/negotiate",
  verifyToken,
  authorizeRoles("buyer"),
  negotiateQuotation
);
router.get(
  "/seller-quotations",
  verifyToken,
  authorizeRoles("seller"),
  getQuotationsBySeller
);

router.post(
  "/send-quotation-email",
  verifyToken,
  authorizeRoles("seller"),
  sendQuotationEmail
);

module.exports = router;
