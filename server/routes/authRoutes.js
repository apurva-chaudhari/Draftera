
const express = require("express");
const { register, login, logout } = require("../controllers/authController");

const router = express.Router();

// Create a new site engineer account.
router.post("/register", register);

// Authenticate an existing account.
router.post("/login", login);

// End the current session.
router.post("/logout", logout);

module.exports = router;
