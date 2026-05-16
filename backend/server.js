require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const http = require("http");
const path = require("path");
const passport = require("./config/passport");

const userRoutes = require("./routes/userRoutes");
const tourPackagesRouter = require("./routes/tourPackages.routes");
const destinationRoutes = require("./routes/destinationRoutes");

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
const adminTourRoutes = require("./routes/admin.tour.routes");

const adminEnquiryRoutes = require("./routes/admin.enquiry.routes");
const adminreviewRoutes = require("./routes/admin.review.routes");
const adminNotificationRoutes = require("./routes/admin.notification.routes");
const userProfileRoutes = require("./routes/user.profile.routes");
const paymentRoutes = require("./routes/payment");
const adminPaymentRoutes = require("./routes/admin.payments.routes");

const app = express();
const server = http.createServer(app);

const { initSocket } = require("./socket");
initSocket(server);

require("./utils/reminderCron");

/* BODY PARSING */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* CORS */
app.use(
  cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
    credentials: true,
  })
);

/* SESSION */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "vehicle_rental_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

/* PASSPORT */
app.use(passport.initialize());
app.use(passport.session());

/* HOME */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/HOME/homepage.html"));
});

/* STATIC */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(express.static(path.join(__dirname, "../frontend")));
app.use(
  express.static(path.join(__dirname, "../frontend/USER DASHBOARD"))
);

/* AUTH ROUTES */
app.use("/api/auth", require("./routes/auth.google.routes"));
app.use("/api/auth", require("./routes/auth.forgot.routes"));
app.use("/api/auth", require("./routes/auth.otp.routes"));

/* USER ROUTES */
app.use("/api", userRoutes);
app.use("/api/user", userProfileRoutes);
app.use("/api/user/vehicles", userVehicleListingRoutes);
app.use("/api/user/vehicle-details", vehicleDetailsRoutes);
app.use("/api/user", enquiryRoutes);
app.use("/api/user/notifications", require("./routes/notificationRoutes"));

/* VEHICLE ROUTES */
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/vehicles", vehicleRoutes_booking);

/* TOUR & DESTINATIONS */
app.use("/api/tour-packages", tourPackagesRouter);
app.use("/api/destinations", destinationRoutes);

/* BOOKINGS */
app.use("/api/bookings", bookingRoutes);
app.use("/api/bookings", mybookingRoutes);

/* OTHER USER SERVICES */
app.use("/api/kyc", kycRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/payments", paymentRoutes);

/* ADMIN ROUTES */
app.use("/api/admin", adminRoutes);
app.use("/api/admin/vehicles", vehicleRoutes);
app.use("/api/admin/kyc", adminKycRoutes);
app.use("/api/admin/bookings", adminBookingRoutes);
app.use("/api/admin/tour-packages", adminTourRoutes);
app.use("/api/admin/servicing", serviceRoutes);
app.use("/api/admin/enquiries", adminEnquiryRoutes);
app.use("/api/admin/reviews", adminreviewRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/admin/payments", adminPaymentRoutes);

/* DASHBOARD */
app.use("/api", userDashboardRoutes);

/* START SERVER */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});