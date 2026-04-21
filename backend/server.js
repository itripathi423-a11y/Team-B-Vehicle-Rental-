require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const cors = require("cors");
const session = require("express-session");
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

// KYC routes
const kycRoutes = require("./routes/kyc.routes");

const mybookingRoutes = require("./routes/mybooking.routes");

const adminKycRoutes = require("./routes/admin.kyc.routes");

// Create Express app
const app = express();

/* =========================
   BODY PARSING
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
    credentials: true,
  }),
);

/* =========================
   SESSION
========================= */
app.use(
  session({
    secret: "vehicle_rental_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

/* =========================
   HOME ROUTE
========================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/HOME/homepage.html"));
});

/* =========================
   STATIC FILES
========================= */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(express.static(path.join(__dirname, "../frontend")));

/* =========================
   ROUTES
========================= */

// User routes
app.use("/api", userRoutes);

// Admin vehicle routes
app.use("/api/vehicles", vehicleRoutes);

// ✅ SPECIFIC admin routes BEFORE the generic /api/admin catch-all
app.use("/api/admin/vehicles", vehicleRoutes);
app.use("/api/admin/kyc", adminKycRoutes);

// Generic admin dashboard (registered AFTER specific sub-routes)
app.use("/api/admin", adminRoutes);

// User dashboard
app.use("/api", userDashboardRoutes);

// User vehicles
app.use("/api/user/vehicles", userVehicleListingRoutes);

// Vehicle details
app.use("/api/user/vehicle-details", vehicleDetailsRoutes);

// Public booking vehicles
app.use("/api/vehicles", vehicleRoutes_booking);

// Bookings
app.use("/api/bookings", bookingRoutes);
app.use("/api/bookings", mybookingRoutes);

// KYC routes (MULTER HANDLED INSIDE ROUTE FILE)
app.use("/api/kyc", kycRoutes);

/* =========================
   START SERVER
========================= */
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
