const express = require("express");

const {createContact} = require("../controllers/api/v1/contactData");

const router = express.Router();

router.post("/contact-us", createContact);

module.exports = router;