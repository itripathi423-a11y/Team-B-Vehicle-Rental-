const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

const userRoutes = require("./routes/userRoutes");
<<<<<<< Updated upstream
const vehicleRoutes = require("./routes/vehicleRoutes");

const app = express();

/* CORS */
app.use(
  cors({
    origin: "http://127.0.0.1:5501",
    credentials: true,
  }),
);

/* JSON */
app.use(express.json());

/* Serve uploads */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/* SESSION */
app.use(
  session({
    secret: "vehicle_rental_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }),
);

/* Static frontend */
=======
const vehicleRoutes = require("./routes/admin.vehicle.routes");
const adminRoutes = require("./routes/admin.dashboard.routes");

const app = express();

// ======================
// 1. BODY PARSER
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================
// 2. CORS FIRST ← moved up
// ======================
app.use(
  cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500"],  // ← added both
    credentials: true,
  }),
);

// ======================
// 3. SESSION AFTER CORS
// ======================
app.use(
  session({
    secret: "vehicle_rental_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
    },
  }),
);

// ======================
// 4. STATIC FILES
// ======================
>>>>>>> Stashed changes
app.use(
  express.static(path.join(__dirname, "../frontend"), {
    index: false,
  }),
);

<<<<<<< Updated upstream
/* Routes */
=======
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ======================
// 5. ROUTES
// ======================
>>>>>>> Stashed changes
app.use("/api", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/admin", adminRoutes);

<<<<<<< Updated upstream
const dashboardRoutes = require("./routes/user.dashboard.routes");

app.use("/api", dashboardRoutes);

/* Home */
=======
// ======================
// 6. HOME ROUTE
// ======================
>>>>>>> Stashed changes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/HOME/homepage.html"));
});

<<<<<<< Updated upstream
/* Start */
=======
// ======================
// 7. START SERVER
// ======================
>>>>>>> Stashed changes
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});