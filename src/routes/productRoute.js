const express = require("express");

const { GetAllProducts, getYears } = require("../controllers/api/v1/products");
const { ProductInsert } = require("../controllers/api/v1/productInsertion");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getBrand,
  getModels,
  getBodyTypes,
  getTrims,
  getGearboxes,
  getFuels,
  getParts,
  addProduct,
  getProductDetails,
  getProductsBySeller,
  getMyProducts,
} = require("../controllers/api/v1/products");
const {
  createProductEnquiry,
} = require("../controllers/api/v1/productsEnquiryController");

const { getProductCompatibility } = require("../controllers/api/v1/products");
const upload = require("../middleware/uploadMiddleware");
const router = express.Router();

router.get("/get-all-products", GetAllProducts);
router.get("/get-product-details/:id", getProductDetails);
router.get("/get-products-by-seller/:sellerId", getProductsBySeller);
router.post("/seed-product-types", ProductInsert);
router.get("/brand", getBrand);
router.get("/models", getModels);
router.get("/years", getYears);
router.get("/body-types", getBodyTypes);
router.get("/trims", getTrims);
router.get("/gearboxes", getGearboxes);
router.get("/fuels", getFuels);
router.get("/parts", getParts);
router.get("/compatibility", getProductCompatibility);
router.post(
  "/add",
  verifyToken,
  authorizeRoles("seller"),
  upload.array("images", 5),
  addProduct
);
router.get(
  "/my-products",
  verifyToken,
  authorizeRoles("seller"),
  getMyProducts
);
router.post(
  "/product-enquiry",
  upload.array("images", 5), // Accept up to 5 images
  createProductEnquiry
);
module.exports = router;
