const express = require("express");
const router = express.Router();
const {
  getCategories,
} = require("../controllers/api/v1/vehicleCategoryController");

router.get("/", getCategories);

module.exports = router;
