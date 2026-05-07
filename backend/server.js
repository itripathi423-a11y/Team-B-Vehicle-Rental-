require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const http = require("http");
const path = require("path");

const userRoutes = require("./routes/userRoutes");
const vehicleRoutes = require("./routes/admin.vehicle.routes");
const adminRoutes = require("./routes/admin.dashboard.routes");
const userDashboardRoutes = require("./routes/user.dashboard.routes");
const userVehicleListingRoutes = require("./routes/user.vehicle.listing.routes");
const vehicleDetailsRoutes = require("./routes/vehicleDetails.routes");
const vehicleRoutes_booking = require("./routes/vehicle.routes");
const bookingRoutes = require("./routes/booking.routes");
const kycRoutes = require("./routes/kyc.routes");
const mybookingRoutes = require("./routes/mybooking.routes");
const adminKycRoutes = require("./routes/admin.kyc.routes");
const adminBookingRoutes = require("./routes/admin.bookings.routes");
const chatRoutes = require("./routes/chat.routes");
const serviceRoutes = require("./routes/admin.servicing.routes");
const reviewRoutes = require("./routes/reviewRoutes");
const enquiryRoutes = require("./routes/enquiry.routes");

const adminEnquiryRoutes = require("./routes/admin.enquiry.routes");
const adminreviewRoutes = require("./routes/admin.review.routes");
const adminNotificationRoutes = require("./routes/admin.notification.routes");
const userProfileRoutes = require("./routes/user.profile.routes");

const app = express();
const server = http.createServer(app);
const { initSocket } = require("./socket"); // ← ADD
initSocket(server);
require("./utils/reminderCron");

/* ── BODY PARSING ── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── CORS ── */
app.use(
  cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
    credentials: true,
  }),
);

/* ── SESSION ── */
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

/* ── HOME ── */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/HOME/homepage.html"));
});

/* ── STATIC ── */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
/* ── ROUTES ── */
app.use("/api/user", userProfileRoutes);
app.use("/api", userRoutes);
app.use("/api/vehicles", vehicleRoutes);

// ✅ Specific /api/admin/* routes MUST come BEFORE the generic /api/admin
app.use("/api/admin/vehicles", vehicleRoutes);
app.use("/api/admin/kyc", adminKycRoutes);
app.use("/api/admin/bookings", adminBookingRoutes); // NEW

// Generic admin dashboard (catch-all — always last among /api/admin routes)
app.use("/api/admin", adminRoutes);

app.use("/api", userDashboardRoutes);
app.use("/api/user/vehicles", userVehicleListingRoutes);
app.use("/api/user/vehicle-details", vehicleDetailsRoutes);
app.use("/api/vehicles", vehicleRoutes_booking);
app.use("/api/bookings", bookingRoutes);
app.use("/api/bookings", mybookingRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin/servicing", serviceRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/user", enquiryRoutes);

app.use("/api/admin/enquiries", adminEnquiryRoutes);
app.use("/api/admin/reviews", adminreviewRoutes);
app.use("/api/user/notifications", require("./routes/notificationRoutes"));
app.use("/api/admin/notifications", adminNotificationRoutes);

app.use(express.static(path.join(__dirname, "../frontend")));

/* ── START ── */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  // ← CHANGE app.listen → server.listen
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
