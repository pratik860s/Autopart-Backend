// filepath: c:\Users\jaarj\Aarjav\autoparts-backend\src\routes\brandRoute.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // For handling file uploads in memory
const { addBrand } = require("../controllers/api/v1/extraController");

router.post("/add", upload.single("file"), addBrand);

module.exports = router;
