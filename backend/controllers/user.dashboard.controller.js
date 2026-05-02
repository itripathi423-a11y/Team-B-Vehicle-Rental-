const db = require("../config/db");

/* ── USER PROFILE ────────────────────────────────────
   GET /api/user/profile
─────────────────────────────────────────────────────── */
exports.getUserProfile = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      u.id, 
      u.name, 
      u.email, 
      u.phone,
      u.role,
      COALESCE(k.status, 'not_submitted') AS kyc_status,
      u.profile_photo
    FROM users u
    LEFT JOIN kyc k ON k.user_id = u.id
    WHERE u.id = ?
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    if (!result.length)
      return res.status(404).json({ message: "User not found" });

    const u = result[0];
    const [first_name, ...last] = u.name.split(" ");

    res.json({
      id: u.id,
      first_name,
      last_name: last.join(" "),
      email: u.email,
      phone: u.phone,
      role: u.role,
      kyc_status: u.kyc_status, // "verified" | "pending" | "rejected" | "not_submitted"
      profile_photo: u.profile_photo || null,
    });
  });
};

/* ── DASHBOARD STATS ─────────────────────────────────
   GET /api/user/bookings/stats
─────────────────────────────────────────────────────── */
exports.getDashboardStats = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      COUNT(*)                                                              AS total,
      SUM(CASE WHEN status = 'Completed'               THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status IN ('Active', 'Confirmed')  THEN 1 ELSE 0 END) AS active,
      COALESCE(SUM(CASE WHEN status = 'Completed' THEN total_price ELSE 0 END), 0) AS total_spent
    FROM bookings
    WHERE user_id = ?
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    res.json(result[0]);
  });
};

/* ── RECENT BOOKINGS ─────────────────────────────────
   GET /api/user/bookings?limit=5&sort=desc
   Returns last 5 bookings for the logged-in user.
─────────────────────────────────────────────────────── */
exports.getRecentBookings = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      b.id,
      b.id            AS booking_id,
      b.booking_ref,
      b.rental_type   AS duration_type,
      b.pickup_datetime,
      b.drop_datetime,
      b.total_price   AS total_amount,
      b.status,
      b.payment_status,
      v.id            AS vehicle_id,
      v.name          AS vehicle_name,
      v.brand,
      v.model,
      v.license_plate,
      v.thumbnail,
      v.body_type,
      v.fuel_type
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
    LIMIT 5
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    res.json(result);
  });
};

/* ── UPCOMING BOOKING ────────────────────────────────
   GET /api/user/upcoming-booking
   Returns the nearest future booking.
─────────────────────────────────────────────────────── */
exports.getUpcomingBooking = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      b.id,
      b.id          AS booking_id,
      b.booking_ref,
      b.pickup_datetime,
      b.drop_datetime,
      b.pickup_location,
      b.status,
      b.total_price AS total_amount,
      v.name        AS vehicle_name,
      v.thumbnail,
      v.brand,
      v.model,
      v.license_plate
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = ?
      AND b.status IN ('Pending', 'Confirmed', 'Active')
      AND b.pickup_datetime >= NOW()
    ORDER BY b.pickup_datetime ASC
    LIMIT 1
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    res.json(result[0] || null);
  });
};

/* ── VEHICLES ────────────────────────────────────────
   GET /api/vehicles
─────────────────────────────────────────────────────── */
exports.getVehicles = (req, res) => {
  db.query(
    "SELECT * FROM vehicles WHERE is_deleted = 0 ORDER BY created_at DESC",
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB error", error: err });
      res.json(result);
    },
  );
};

/* ── NOTIFICATIONS COUNT ─────────────────────────────
   GET /api/user/notifications/unread-count
─────────────────────────────────────────────────────── */
exports.getUnreadNotifications = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT COUNT(*) AS count
    FROM notifications
    WHERE user_id = ? AND is_read = 0
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    res.json(result[0]); // { count: 3 }
  });
};
