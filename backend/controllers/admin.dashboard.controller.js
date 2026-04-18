const db = require("../config/db");

// ================= ADMIN PROFILE =================
exports.getMe = (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Not logged in",
      });
    }

    return res.json({
      name: req.session.user.name,
      role: req.session.user.role,
      email: req.session.user.email,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ================= DASHBOARD STATS =================
exports.getStats = (req, res) => {
  const sqlVehicles = "SELECT COUNT(*) AS count FROM vehicles";
  const sqlBookings =
    "SELECT COUNT(*) AS count FROM bookings WHERE status='Active'";
  const sqlRevenue =
    "SELECT SUM(total_price) AS total FROM bookings WHERE payment_status='Paid'";
  const sqlKyc = "SELECT COUNT(*) AS count FROM kyc WHERE status='pending'";

  db.query(sqlVehicles, (err1, v) => {
    if (err1) return res.status(500).json(err1);

    db.query(sqlBookings, (err2, b) => {
      if (err2) return res.status(500).json(err2);

      db.query(sqlRevenue, (err3, r) => {
        if (err3) return res.status(500).json(err3);

        db.query(sqlKyc, (err4, k) => {
          if (err4) return res.status(500).json(err4);

          return res.json({
            total_vehicles: v[0]?.count || 0,
            active_bookings: b[0]?.count || 0,
            revenue_this_month: r[0]?.total || 0,
            pending_kyc: k[0]?.count || 0,
          });
        });
      });
    });
  });
};

// ================= RECENT BOOKINGS =================
exports.getBookings = (req, res) => {
  const limit = parseInt(req.query.limit) || 5;

  const sql = `
    SELECT b.*, v.name AS vehicle_name
    FROM bookings b
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    ORDER BY b.created_at DESC
    LIMIT ?
  `;

  db.query(sql, [limit], (err, results) => {
    if (err) return res.status(500).json(err);

    return res.json(results);
  });
};
