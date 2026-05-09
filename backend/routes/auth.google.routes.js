const express = require("express");
const router = express.Router();
const passport = require("../config/passport");

// Start Google login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

// Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/LOGIN/index.html?error=google",
  }),
  (req, res) => {
    const user = req.user;

    // Set session same as normal login
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    // Redirect based on role
    if (user.role === "admin") {
      res.redirect("/ADMIN%20DASHBOARD/dashboard.html");
    } else {
      res.redirect("/USER%20DASHBOARD/userdashboard.html");
    }
  },
);

module.exports = router;
