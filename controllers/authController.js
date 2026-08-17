const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ==========================================================
// CREATE JWT
// ==========================================================

const createToken = (userId) => {
  return jwt.sign(
    {
      id: userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );
};


// ==========================================================
// REGISTER USER
// ==========================================================

const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email and password are required",
      });
    }

    // Normalize email
    const normalizedEmail =
      email.trim().toLowerCase();

    // Check existing user
    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          "An account with this email already exists",
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    // Hash password
    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    // Create user
    const user =
      await User.create({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone
          ? phone.trim()
          : "",
        password:
          hashedPassword,
      });

    // Generate token
    const token =
      createToken(user._id);

    res.status(201).json({
      success: true,
      message:
        "Account created successfully",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });

  } catch (error) {

    console.error(
      "Register user error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error",
    });
  }
};


// ==========================================================
// LOGIN USER
// ==========================================================

const loginUser = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    // Find user
    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // Check account status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is currently disabled",
      });
    }

    // Compare password
    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // Generate token
    const token =
      createToken(user._id);

    res.json({
      success: true,
      message:
        "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });

  } catch (error) {

    console.error(
      "Login user error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error",
    });
  }
};


// ==========================================================
// GET CURRENT USER
// ==========================================================

const getCurrentUser = async (
  req,
  res
) => {
  try {

    const user =
      await User.findById(
        req.user.id
      ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });

  } catch (error) {

    console.error(
      "Get current user error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error",
    });
  }
};


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};