const db = require("../config/db");
const transporter = require("../utils/mailer");

/* FORGOT PASSWORD */
exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (user.length === 0)
      return res.status(404).json({ message: "User not found" });

    // 6-digit OTP (matches the 6 input boxes in frontend)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Invalidate old unused tokens first
    db.query(
      "UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0",
      [user[0].id],
      (err2) => {
        if (err2) return res.status(500).json({ message: "DB error" });

        // Insert new OTP
        db.query(
          "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
          [user[0].id, otp, expiresAt],
          (err3) => {
            if (err3) return res.status(500).json({ message: "Insert failed" });

            // Send OTP email
            transporter.sendMail(
              {
                from: `"Vehicle Rental" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "Your Password Reset OTP",
                html: `
                  <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;">
                    <h2 style="color:#333;margin-bottom:8px;">Password Reset OTP</h2>
                    <p>Use the code below to reset your password. It expires in <strong>15 minutes</strong>.</p>
                    <div style="font-size:36px;font-weight:bold;letter-spacing:10px;text-align:center;padding:20px;background:#f5f5f5;border-radius:6px;margin:16px 0;">
                      ${otp}
                    </div>
                    <p style="color:#999;font-size:12px;">If you didn't request this, ignore this email.</p>
                  </div>
                `,
              },
              (mailErr) => {
                if (mailErr) {
                  console.error("Mail error:", mailErr);
                  return res
                    .status(500)
                    .json({ message: "Failed to send OTP email" });
                }
                res.json({ message: "OTP sent to your email" });
              },
            );
          },
        );
      },
    );
  });
};

/* RESET PASSWORD */
exports.resetPassword = (req, res) => {
  const { token, newPassword } = req.body;

  db.query(
    "SELECT * FROM password_resets WHERE token = ? AND used = 0",
    [token],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (rows.length === 0)
        return res.status(400).json({ message: "Invalid OTP" });

      if (new Date(rows[0].expires_at) < new Date()) {
        return res.status(400).json({ message: "OTP expired" });
      }

      db.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [newPassword, rows[0].user_id],
        (err2) => {
          if (err2)
            return res.status(500).json({ message: "Password update failed" });

          db.query(
            "UPDATE password_resets SET used = 1 WHERE id = ?",
            [rows[0].id],
            (err3) => {
              if (err3)
                return res.status(500).json({ message: "Token update failed" });
              res.json({ message: "Password reset successful" });
            },
          );
        },
      );
    },
  );
};
