const db = require("../config/db");

/* =========================
   REGISTER USER
========================= */
exports.registerUser = (req, res) => {
  const { name, email, phone, password } = req.body;

  // Validation
  if (!name || !email || !phone || !password) {
    return res.json({
      success: false,
      message: "All fields required",
    });
  }

  // Check email exists
  db.query("SELECT * FROM users WHERE email=?", [email], (err, result) => {
    if (err) {
      return res.json({
        success: false,
        message: "Server error",
      });
    }

    if (result.length > 0) {
      return res.json({
        success: false,
        message: "Email already exists",
      });
    }

    // Insert user
    db.query(
      "INSERT INTO users (name, email, phone, password, role) VALUES (?,?,?,?,?)",
      [name, email, phone, password, "user"],
      (err2) => {
        if (err2) {
          return res.json({
            success: false,
            message: "Registration failed",
          });
        }

        return res.json({
          success: true,
          message: "Registration successful",
        });
      }
    );
  });
};

/* =========================
   LOGIN USER
========================= */
exports.loginUser = (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email=?", [email], (err, result) => {
    if (err) {
      return res.json({
        success: false,
        message: "Server error",
      });
    }

    if (!result.length) {
      return res.json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = result[0];

    if (user.password !== password) {
      return res.json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Session create
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return res.json({
      success: true,
      message: "Login successful",
      user: req.session.user,
    });
  });
};

/* =========================
   LOGOUT USER
========================= */
exports.logoutUser = (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
};

/* =========================
   PROFILE
========================= */
exports.getUserProfile = (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({});
  }

  const id = req.session.user.id;

  db.query("SELECT * FROM users WHERE id=?", [id], (err, result) => {
    if (err || !result.length) {
      return res.status(500).json({});
    }

    const u = result[0];

    return res.json({
      id: u.id,
      first_name: u.name.split(" ")[0],
      last_name: u.name.split(" ")[1] || "",
      email: u.email,
      phone: u.phone,
      kyc_status: "Pending",
      profile_photo: null,
    });
  });
};

/* =========================
   BOOKING STATS
========================= */
exports.getBookingStats = (req, res) => {
  if (!req.session.user) return res.status(401).json({});

  const userId = req.session.user.id;

  db.query(
    `
    SELECT 
      COUNT(*) AS total,
      IFNULL(SUM(status='Completed'),0) AS completed,
      IFNULL(SUM(status='Active'),0) AS active,
      IFNULL(SUM(total_price),0) AS total_spent
    FROM bookings
    WHERE user_id=?
  `,
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({});
      res.json(result[0]);
    }
  );
};

/* =========================
   BOOKINGS
========================= */
exports.getUserBookings = (req, res) => {
  if (!req.session.user) return res.status(401).json([]);

  const userId = req.session.user.id;

  db.query(
    `
    SELECT 
      v.name AS vehicle_name,
      v.license_plate,
      v.thumbnail,
      b.rental_type AS duration_type,
      b.pickup_datetime,
      b.total_price AS total_amount,
      b.status
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id=?
    ORDER BY b.created_at DESC
    LIMIT 5
  `,
    [userId],
    (err, result) => {
      if (err) return res.status(500).json([]);
      res.json(result);
    }
  );
};

/* =========================
   UPCOMING BOOKING
========================= */
exports.getUpcomingBooking = (req, res) => {
  if (!req.session.user) return res.status(401).json(null);

  const userId = req.session.user.id;

  db.query(
    `
    SELECT 
      v.name AS vehicle_name,
      v.license_plate,
      v.fuel_type,
      v.body_type,
      v.seating_capacity,
      b.rental_type AS duration_type,
      b.pickup_datetime,
      b.total_price AS total_amount
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id=? AND b.pickup_datetime > NOW()
    LIMIT 1
  `,
    [userId],
    (err, result) => {
      if (err) return res.status(500).json(null);
      res.json(result[0] || null);
    }
  );
};