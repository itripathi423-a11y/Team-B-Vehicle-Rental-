const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

const userRoutes = require("./routes/userRoutes");
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
app.use(
  express.static(path.join(__dirname, "../frontend"), {
    index: false,
  }),
);

/* Routes */
app.use("/api", userRoutes);
app.use("/api/vehicles", vehicleRoutes);

const dashboardRoutes = require("./routes/user.dashboard.routes");

app.use("/api", dashboardRoutes);

/* Home */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/HOME/homepage.html"));
});

/* Start */
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
