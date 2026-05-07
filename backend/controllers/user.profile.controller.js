const db = require("../config/db");

// ================= GET PROFILE =================
exports.getProfile = (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  const userId = req.session.user.id;

  const sql = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.phone,
      u.role,
      u.created_at,
      COALESCE(k.status, 'not_submitted') AS kyc_status
    FROM users u
    LEFT JOIN kyc k ON k.user_id = u.id
    WHERE u.id = ?
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const u = rows[0];

    const parts = (u.name || "").trim().split(" ");
    const first_name = parts[0] || "";
    const last_name = parts.slice(1).join(" ") || "";

    // Force created_at to a plain ISO string regardless of what the driver returns
    let createdAt = null;
    if (u.created_at) {
      const d =
        u.created_at instanceof Date ? u.created_at : new Date(u.created_at);
      createdAt = isNaN(d.getTime()) ? null : d.toISOString();
    }

    return res.json({
      id: u.id,
      name: u.name,
      first_name,
      last_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      kyc_status: u.kyc_status,
      created_at: createdAt,
    });
  });
};

// ================= UPDATE PROFILE =================
exports.updateProfile = (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  const { first_name, last_name, email, phone } = req.body;

  if (!first_name || !first_name.trim())
    return res
      .status(400)
      .json({ success: false, message: "First name is required" });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res
      .status(400)
      .json({ success: false, message: "Valid email is required" });
  if (!phone || !/^\d{10}$/.test(phone))
    return res
      .status(400)
      .json({ success: false, message: "Phone must be exactly 10 digits" });

  const userId = req.session.user.id;
  const fullName = `${first_name.trim()} ${(last_name || "").trim()}`.trim();

  db.query(
    "SELECT id FROM users WHERE email = ? AND id != ?",
    [email.trim(), userId],
    (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      if (rows.length)
        return res
          .status(409)
          .json({ success: false, message: "Email already in use" });

      db.query(
        "UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?",
        [fullName, email.trim(), phone.trim(), userId],
        (err2) => {
          if (err2)
            return res
              .status(500)
              .json({ success: false, message: err2.message });

          req.session.user.name = fullName;
          req.session.user.email = email.trim();

          return res.json({
            success: true,
            message: "Profile updated successfully",
          });
        },
      );
    },
  );
};

// ================= CHANGE PASSWORD =================
exports.changePassword = (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  const { current_password, new_password } = req.body;

  if (!current_password || !new_password)
    return res
      .status(400)
      .json({ success: false, message: "Both password fields are required" });
  if (new_password.length < 8)
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters",
    });
  if (current_password === new_password)
    return res.status(400).json({
      success: false,
      message: "New password must differ from current",
    });

  const userId = req.session.user.id;

  db.query("SELECT password FROM users WHERE id = ?", [userId], (err, rows) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (current_password !== rows[0].password)
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });

    db.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [new_password, userId],
      (err2) => {
        if (err2)
          return res
            .status(500)
            .json({ success: false, message: err2.message });

        return res.json({
          success: true,
          message: "Password changed successfully",
        });
      },
    );
  });
};

// ================= DELETE ACCOUNT =================
exports.deleteAccount = (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  const userId = req.session.user.id;

  db.query("DELETE FROM users WHERE id = ?", [userId], (err) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });

    req.session.destroy(() => {
      return res.json({ success: true, message: "Account deleted" });
    });
  });
};
