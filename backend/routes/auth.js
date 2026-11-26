const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// Helper: send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      contactPerson: user.contactPerson,
      templeName: user.templeName,
    },
  });
};

// POST /api/auth/register — Register a new user (temple registration)
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ success: false, errors: errors.array() });
      }

      const { name, email, password, role, phone, address, contactPerson, templeName } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res
          .status(400)
          .json({ success: false, message: "An account with this email already exists" });
      }

      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role: role || "temple",
        phone,
        address,
        contactPerson,
        templeName: templeName || name,
      });

      sendTokenResponse(user, 201, res);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// POST /api/auth/login — Log in
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ success: false, errors: errors.array() });
      }

      const { email, password, role } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() }).select(
        "+password"
      );

      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Account not found or password is incorrect" });
      }

      // If role is specified, check it matches
      if (role && user.role !== role) {
        return res.status(401).json({
          success: false,
          message: `This account is registered as '${user.role}', not '${role}'`,
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ success: false, message: "Account not found or password is incorrect" });
      }

      sendTokenResponse(user, 200, res);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// GET /api/auth/me — Get current user profile
router.get("/me", protect, async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

module.exports = router;
