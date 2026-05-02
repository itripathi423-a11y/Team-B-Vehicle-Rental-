// admin.dashboard.controller.js
const db = require("../config/db");

// ================= ADMIN PROFILE =================
exports.getMe = (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  const adminId = req.session.user.id;

  db.query(
    "SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?",
    [adminId],
    (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      if (!rows.length)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      const u = rows[0];
      return res.json({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        created_at: u.created_at,
      });
    },
  );
};

// ================= DASHBOARD STATS =================
exports.getStats = (req, res) => {
  const queries = [
    "SELECT COUNT(*) AS count FROM vehicles WHERE is_deleted = 0",
    "SELECT COUNT(*) AS count FROM bookings WHERE status = 'Active'",
    "SELECT COALESCE(SUM(total_price), 0) AS total FROM bookings WHERE payment_status = 'Paid'",
    "SELECT COUNT(*) AS count FROM kyc WHERE status = 'pending'",
    "SELECT COUNT(*) AS count FROM enquiries",
  ];

  Promise.all(
    queries.map(
      (sql) =>
        new Promise((resolve, reject) =>
          db.query(sql, (err, rows) => {
            if (err) return reject(err);
            resolve(rows[0]);
          }),
        ),
    ),
  )
    .then(([v, b, r, k, e]) => {
      res.json({
        total_vehicles: Number(v.count) || 0,
        active_bookings: Number(b.count) || 0,
        revenue_this_month: Number(r.total) || 0,
        pending_kyc: Number(k.count) || 0,
        total_enquiries: Number(e.count) || 0,
      });
    })
    .catch((err) => {
      res.status(500).json({ success: false, message: err.message });
    });
};

// ================= RECENT BOOKINGS =================
exports.getBookings = (req, res) => {
  const sql = `
    SELECT
      b.id,
      b.booking_ref,
      b.user_name,
      v.name        AS vehicle_name,
      b.total_days,
      b.total_price,
      b.status,
      b.created_at
    FROM bookings b
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    ORDER BY b.created_at DESC
    LIMIT 5
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({ success: true, data: results });
  });
};

// ================= UPDATE PROFILE =================
exports.updateProfile = (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  const { name, email, phone } = req.body;

  if (!name || !email) {
    return res
      .status(400)
      .json({ success: false, message: "Name and email are required" });
  }

  const adminId = req.session.user.id;

  db.query(
    "SELECT id FROM users WHERE email = ? AND id != ?",
    [email, adminId],
    (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      if (rows.length > 0) {
        return res
          .status(409)
          .json({ success: false, message: "Email already in use" });
      }

      db.query(
        "UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?",
        [name.trim(), email.trim(), (phone || "").trim(), adminId],
        (err2) => {
          if (err2)
            return res
              .status(500)
              .json({ success: false, message: err2.message });

          req.session.user.name = name.trim();
          req.session.user.email = email.trim();

          return res.json({ success: true, message: "Profile updated" });
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

  if (!current_password || !new_password) {
    return res
      .status(400)
      .json({ success: false, message: "Both password fields are required" });
  }
  if (new_password.length < 8) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Password must be at least 8 characters",
      });
  }

  const adminId = req.session.user.id;

  db.query(
    "SELECT password FROM users WHERE id = ?",
    [adminId],
    (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      if (!rows.length)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      if (current_password !== rows[0].password) {
        return res
          .status(401)
          .json({ success: false, message: "Current password is incorrect" });
      }

      db.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [new_password, adminId],
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
    },
  );
};
