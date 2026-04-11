const User = require("../models/userModel");
const bcrypt = require("bcrypt");

const saltRounds = 10;

// REGISTER
const registerUser = (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.json({ success: false, message: "All fields are required" });
  }

  User.findUserByEmail(email, async (err, result) => {
    if (err) {
      return res.json({ success: false, message: "Server error" });
    }

    if (result.length > 0) {
      return res.json({ success: false, message: "Email already exists" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      User.createUser(
        { name, email, phone, password: hashedPassword },
        (err) => {
          if (err) {
            return res.json({ success: false, message: "Registration failed" });
          }

          return res.json({
            success: true,
            message: "Registration successful",
          });
        },
      );
    } catch (error) {
      return res.json({ success: false, message: "Error occurred" });
    }
  });
};

// LOGIN
const loginUser = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password required",
    });
  }

  User.findUserByEmail(email, async (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (!results || results.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const user = results[0];

    try {
      const match = await bcrypt.compare(password, user.password);

      if (match) {
        return res.json({
          success: true,
          message: "Login successful",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
          },
        });
      } else {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, message: "Error occurred" });
    }
  });
};

module.exports = { registerUser, loginUser };
