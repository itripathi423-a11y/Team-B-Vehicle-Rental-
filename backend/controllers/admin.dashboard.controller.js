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
  const sql = `
  SELECT 
    b.id,
    b.booking_ref,
    b.user_name,
    b.vehicle_name,
    b.total_days,
    b.total_price,
    b.status
  FROM bookings b
  ORDER BY b.booked_on DESC
  LIMIT 3
`;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    return res.json({
      success: true,
      data: results,
    });
  });
};
