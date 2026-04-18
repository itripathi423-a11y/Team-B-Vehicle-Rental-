const db = require("../config/db");

/* REGISTER */
exports.registerUser = (req, res) => {
  const { name, email, phone, password } = req.body;

<<<<<<< Updated upstream
  db.query("SELECT * FROM users WHERE email=?", [email], (err, result) => {
    if (result.length > 0) {
      return res.json({ success: false, message: "Email exists" });
    }

    db.query(
      "INSERT INTO users (name,email,phone,password,role) VALUES (?,?,?,?,?)",
      [name, email, phone, password, "user"],
      () => res.json({ success: true }),
=======
  if (!name || !email || !phone || !password) {
    return res.json({
      success: false,
      message: "All fields required",
    });
  }

  User.findUserByEmail(email, (err, result) => {
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

    User.createUser(
      {
        name,
        email,
        phone,
        password,
        role: "user",
      },
      (err) => {
        if (err) {
          return res.json({
            success: false,
            message: "Registration failed",
          });
        }

        return res.json({
          success: true,
          message: "Registration successful",
        });
      },
>>>>>>> Stashed changes
    );
  });
};

<<<<<<< Updated upstream
/* LOGIN */
exports.loginUser = (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email=?", [email], (err, result) => {
    if (!result.length) {
      return res.json({ success: false });
    }

    const user = result[0];

    if (user.password !== password) {
      return res.json({ success: false });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
    };

    res.json({ success: true });
  });
};

/* LOGOUT */
exports.logoutUser = (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
};

/* PROFILE */
exports.getUserProfile = (req, res) => {
  if (!req.session.user) return res.status(401).json({});

  const id = req.session.user.id;

  db.query("SELECT * FROM users WHERE id=?", [id], (err, result) => {
    const u = result[0];

    res.json({
      id: u.id,
      first_name: u.name.split(" ")[0],
      last_name: u.name.split(" ")[1] || "",
      email: u.email,
      phone: u.phone,
      kyc_status: "Pending",
      profile_photo: null,
=======
// LOGIN (SESSION BASED - FIXED)
const loginUser = (req, res) => {
  const { email, password } = req.body;

  User.findUserByEmail(email, (err, results) => {
    if (err) {
      return res.json({
        success: false,
        message: "Server error",
      });
    }

    if (!results || results.length === 0) {
      return res.json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = results[0];

    // Plain password check
    if (password !== user.password) {
      return res.json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ✅ CREATE SESSION
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    console.log("LOGIN SESSION CREATED:", req.session.user);

    // ✅ IMPORTANT RESPONSE FOR FRONTEND
    return res.json({
      success: true,
      message: "Login successful",
      role: user.role,
      user: req.session.user,
>>>>>>> Stashed changes
    });
  });
};

<<<<<<< Updated upstream
/* STATS */
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
      res.json(result[0]);
    },
  );
};

/* BOOKINGS */
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
      res.json(result);
    },
  );
};

/* UPCOMING */
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
      res.json(result[0] || null);
    },
  );
=======
module.exports = {
  registerUser,
  loginUser,
>>>>>>> Stashed changes
};
