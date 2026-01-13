const express = require("express");
const router = express.Router();
const controller = require("../controllers/api/v1/serviceableLocationController");

router.post("/add", controller.create);
router.post("/check", controller.checkServiceable);

module.exports = router;
