
const express = require("express");
const { register, login } = require("../controllers/authController");

const router = express.Router();

// Create a new site engineer account.
router.post("/register", register);

// Authenticate an existing account.
router.post("/login", login);

module.exports = router;
