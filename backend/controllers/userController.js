const User = require("../models/userModel");

// REGISTER (NO HASHING)
const registerUser = (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.json({ success: false, message: "All fields required" });
  }

  User.findUserByEmail(email, (err, result) => {
    if (err) {
      return res.json({ success: false, message: "Server error" });
    }

    if (result.length > 0) {
      return res.json({ success: false, message: "Email already exists" });
    }

    User.createUser(
      {
        name,
        email,
        phone,
        password, // ❌ plain password
        role: "user",
      },
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
  });
};

// LOGIN (NO bcrypt)
const loginUser = (req, res) => {
  const { email, password } = req.body;

  User.findUserByEmail(email, (err, results) => {
    if (err) {
      return res.json({ success: false, message: "Server error" });
    }

    if (!results || results.length === 0) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const user = results[0];

    // ❌ plain password check
    if (password !== user.password) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    // SESSION
    if (req.session) {
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    }

    return res.json({
      success: true,
      message: "Login successful",
      role: user.role,
      user: req.session?.user || user,
    });
  });
};

module.exports = { registerUser, loginUser };
