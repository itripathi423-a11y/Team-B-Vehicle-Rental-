// Import Express framework
const express = require("express");

// Import CORS for cross-origin requests
const cors = require("cors");

// Import session middleware for authentication sessions
const session = require("express-session");

// Import path module for file path handling
const path = require("path");

// Import user-related routes
const userRoutes = require("./routes/userRoutes");

// Import admin vehicle routes
const vehicleRoutes = require("./routes/admin.vehicle.routes");

// Import admin dashboard routes
const adminRoutes = require("./routes/admin.dashboard.routes");

// Import user dashboard routes
const userDashboardRoutes = require("./routes/user.dashboard.routes");

// Import user vehicle listing routes
const userVehicleListingRoutes = require("./routes/user.vehicle.listing.routes");

const vehicleDetailsRoutes = require("./routes/vehicleDetails.routes");

const vehicleRoutes_booking = require("./routes/vehicle.routes");
const bookingRoutes = require("./routes/booking.routes");

// Create Express app instance
const app = express();

/* =========================
   BODY PARSING
========================= */

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

/* =========================
   CORS (IMPORTANT)
========================= */

// Enable CORS for frontend access
app.use(
  cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500"], // allowed frontend URLs
    credentials: true, // allow cookies/session sharing
  }),
);

/* =========================
   SESSION (FIXED)
   THIS WAS YOUR MAIN ISSUE
========================= */

// Configure session middleware
app.use(
  session({
    secret: "vehicle_rental_secret", // secret key for session encryption
    resave: false, // do not save session if not modified
    saveUninitialized: false, // do not create empty sessions
    cookie: {
      httpOnly: true, // prevent JS access to cookies
      secure: false, // allow HTTP (localhost only)
      sameSite: "lax", // fix for browser cookie blocking issues
      maxAge: 24 * 60 * 60 * 1000, // session expiry (1 day)
    },
  }),
);

/* =========================
   HOME ROUTE
========================= */

// Serve homepage HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/HOME/homepage.html"));
});

/* =========================
   STATIC FILES
========================= */

// Serve uploaded files publicly
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Serve frontend static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "../frontend")));

/* =========================
   ROUTES
========================= */

// User authentication routes
app.use("/api", userRoutes);

// Vehicle management routes (admin)
app.use("/api/vehicles", vehicleRoutes);

// Admin dashboard routes
app.use("/api/admin", adminRoutes);

// User dashboard routes
app.use("/api", userDashboardRoutes);

// User vehicle listing routes
app.use("/api/user/vehicles", userVehicleListingRoutes);
// API base
app.use("/api/user/vehicle-details", vehicleDetailsRoutes);
app.use("/api/admin/vehicles", vehicleRoutes); // admin routes
app.use("/api/vehicles", vehicleRoutes_booking); // public booking routes
app.use("/api/bookings", bookingRoutes);
/* =========================
   SERVER START
========================= */

// Start server on port 5000
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
