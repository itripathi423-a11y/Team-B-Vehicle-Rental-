const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");

const userRoutes = require("./routes/userRoutes");
const vehicleRoutes = require("./routes/admin.vehicle.routes");
const adminRoutes = require("./routes/admin.dashboard.routes");
const userDashboardRoutes = require("./routes/user.dashboard.routes");

const app = express();

/* BODY */
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
    secret: "vehicle_rental_secret",
    resave: false,
    saveUninitialized: false,
  })
);

/* HOME ROUTE (MOVE THIS UP) */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/HOME/homepage.html"));
});

/* STATIC (AFTER HOME ROUTE) */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(express.static(path.join(__dirname, "../frontend")));

/* ROUTES */
app.use("/api", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", userDashboardRoutes);

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});