const router = require("express").Router();

router.use("/auth", require("./authRoute"));
router.use("/admin", require("./adminRoute"));
router.use("/contact", require("./contactRoute"));
router.use("/products", require("./productRoute"));
router.use("/vehicles", require("./vehicleRoute"));
router.use("/chat", require("./chatRoute"));
router.use("/feedback", require("./feedbackRoute"));
router.use("/admin", require("./adminRoute"));
router.use("/enquiries", require("./enquiryRoute"));
router.use("/quotations", require("./quotationRoute"));
router.use("/upload", require("./uploadRoute"));
router.use("/extra", require("./extraRoute"));
router.use("/vehicle-categories", require("./vehicleCategoryRoute"));
router.use("/serviceable-locations", require("./serviceableLocationRoute"));
module.exports = router;
