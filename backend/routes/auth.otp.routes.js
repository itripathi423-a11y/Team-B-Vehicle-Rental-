const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  db.query(
    `SELECT pr.* FROM password_resets pr
     JOIN users u ON u.id = pr.user_id
     WHERE u.email = ? AND pr.token = ? AND pr.used = 0`,
    [email, otp],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

      if (rows.length === 0) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      if (new Date(rows[0].expires_at) < new Date()) {
        return res.status(400).json({ message: "OTP expired" });
      }

      res.json({ message: "OTP verified" });
    },
  );
});

module.exports = router;
