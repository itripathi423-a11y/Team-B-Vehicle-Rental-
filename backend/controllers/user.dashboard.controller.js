const db = require("../config/db");

/* USER PROFILE */
exports.getUserProfile = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT id, name, email, phone
    FROM users
    WHERE id = ?
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (!result.length) return res.status(404).json({ message: "User not found" });

    const u = result[0];
    const [first_name, ...last] = u.name.split(" ");

    res.json({
      id: u.id,
      first_name,
      last_name: last.join(" "),
      email: u.email,
      phone: u.phone,
    });
  });
};

/* DASHBOARD STATS */
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

/* RECENT BOOKINGS */
exports.getRecentBookings = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      b.id,
      b.rental_type,
      b.pickup_datetime,
      b.total_price,
      b.status,
      v.name AS vehicle_name,
      v.license_plate,
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

/* UPCOMING BOOKING */
exports.getUpcomingBooking = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT b.*, v.name AS vehicle_name
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = ?
      AND b.pickup_datetime >= NOW()
    ORDER BY b.pickup_datetime ASC
    LIMIT 1
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0] || null);
  });
};

/* VEHICLES */
exports.getVehicles = (req, res) => {
  db.query("SELECT * FROM vehicles WHERE is_deleted = 0", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

/* NOTIFICATIONS */
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