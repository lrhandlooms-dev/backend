const express = require("express");

const {
  registerUser,
  loginUser,
  getCurrentUser,
} = require("../controllers/authController");

const userProtect = require("../middleware/userAuthMiddleware");

const router = express.Router();


// ==========================================================
// USER REGISTER
// ==========================================================

router.post(
  "/register",
  registerUser
);


// ==========================================================
// USER LOGIN
// ==========================================================

router.post(
  "/login",
  loginUser
);


// ==========================================================
// CURRENT USER
// ==========================================================

router.get(
  "/me",
  userProtect,
  getCurrentUser
);


module.exports = router;