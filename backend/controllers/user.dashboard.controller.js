const db = require("../config/db");

/* ─────────────────────────────
   USER PROFILE
───────────────────────────── */
exports.getUserProfile = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      u.role,
      k.status AS kyc_status,
      k.document_front AS profile_photo
    FROM users u
    LEFT JOIN kyc k ON u.id = k.user_id
    WHERE u.id = ?
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
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
      kyc_status: u.kyc_status || "not_submitted",
      profile_photo: u.profile_photo || null,
    });
  });
};

/* ─────────────────────────────
   BOOKING STATS
───────────────────────────── */
exports.getDashboardStats = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status IN ('Active','Confirmed') THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'Completed' THEN total_price ELSE 0 END) AS total_spent
    FROM bookings
    WHERE user_id = ?
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0]);
  });
};

/* ─────────────────────────────
   RECENT BOOKINGS
───────────────────────────── */
exports.getRecentBookings = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      b.id,
      b.rental_type AS duration_type,
      b.pickup_datetime,
      b.total_price AS total_amount,
      b.status,

      v.name AS vehicle_name,
      v.license_plate,
      v.body_type,
      v.thumbnail

    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
    LIMIT 5
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

/* ─────────────────────────────
   UPCOMING BOOKING
───────────────────────────── */
exports.getUpcomingBooking = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      b.*,
      v.name AS vehicle_name,
      v.license_plate,
      v.fuel_type,
      v.body_type,
      v.seating_capacity
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = ?
      AND b.pickup_datetime >= NOW()
      AND b.status IN ('Pending','Confirmed','Active')
    ORDER BY b.pickup_datetime ASC
    LIMIT 1
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0] || null);
  });
};

/* ─────────────────────────────
   VEHICLES LIST
───────────────────────────── */
exports.getVehicles = (req, res) => {
  const { status, limit } = req.query;

  let sql = `SELECT * FROM vehicles WHERE is_deleted = 0`;
  const params = [];

  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }

  sql += " ORDER BY created_at DESC";

  if (limit) {
    sql += " LIMIT ?";
    params.push(parseInt(limit));
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

/* ─────────────────────────────
   NOTIFICATIONS COUNT
───────────────────────────── */
exports.getUnreadNotifications = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT COUNT(*) AS count
    FROM notifications
    WHERE user_id = ? AND is_read = 0
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0]);
  });
};
