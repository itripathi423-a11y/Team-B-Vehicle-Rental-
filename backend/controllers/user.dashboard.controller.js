// Import database connection
const db = require("../config/db");

/* USER PROFILE */

// Get user profile details
exports.getUserProfile = (req, res) => {
  // Get logged-in user ID from auth middleware
  const userId = req.user.id;

  // SQL query to fetch user details
  const sql = `
    SELECT id, name, email, phone
    FROM users
    WHERE id = ?
  `;

  // Execute query
  db.query(sql, [userId], (err, result) => {
    // Handle database error
    if (err) return res.status(500).json(err);

    // If user not found
    if (!result.length)
      return res.status(404).json({ message: "User not found" });

    // Get first user record
    const u = result[0];

    // Split full name into first and last name
    const [first_name, ...last] = u.name.split(" ");

    // Return formatted user profile
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

// Get booking statistics for dashboard
exports.getDashboardStats = (req, res) => {
  // Get logged-in user ID
  const userId = req.user.id;

  // SQL query for booking stats
  const sql = `
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status IN ('Active','Confirmed') THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'Completed' THEN total_price ELSE 0 END) AS total_spent
    FROM bookings
    WHERE user_id = ?
  `;

  // Execute query
  db.query(sql, [userId], (err, result) => {
    // Handle error
    if (err) return res.status(500).json(err);

    // Send stats result
    res.json(result[0]);
  });
};

/* RECENT BOOKINGS */

// Get last 5 recent bookings
exports.getRecentBookings = (req, res) => {
  // Get user ID
  const userId = req.user.id;

  // SQL query to fetch recent bookings with vehicle details
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

  // Execute query
  db.query(sql, [userId], (err, result) => {
    // Handle error
    if (err) return res.status(500).json(err);

    // Return booking list
    res.json(result);
  });
};

/* UPCOMING BOOKING */

// Get next upcoming booking
exports.getUpcomingBooking = (req, res) => {
  // Get user ID
  const userId = req.user.id;

  // SQL query for nearest upcoming booking
  const sql = `
    SELECT b.*, v.name AS vehicle_name
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = ?
      AND b.pickup_datetime >= NOW()
    ORDER BY b.pickup_datetime ASC
    LIMIT 1
  `;

  // Execute query
  db.query(sql, [userId], (err, result) => {
    // Handle error
    if (err) return res.status(500).json(err);

    // Return first upcoming booking or null
    res.json(result[0] || null);
  });
};

/* VEHICLES */

// Get all available vehicles
exports.getVehicles = (req, res) => {
  // Query vehicles that are not deleted
  db.query("SELECT * FROM vehicles WHERE is_deleted = 0", (err, result) => {
    // Handle error
    if (err) return res.status(500).json(err);

    // Return vehicle list
    res.json(result);
  });
};

/* NOTIFICATIONS */

// Get unread notification count
exports.getUnreadNotifications = (req, res) => {
  // Get user ID
  const userId = req.user.id;

  // SQL query to count unread notifications
  const sql = `
    SELECT COUNT(*) AS count
    FROM notifications
    WHERE user_id = ? AND is_read = 0
  `;

  // Execute query
  db.query(sql, [userId], (err, result) => {
    // Handle error
    if (err) return res.status(500).json(err);

    // Return unread count
    res.json(result[0]);
  });
};
