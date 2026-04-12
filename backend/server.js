const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

const userRoutes = require("./routes/userRoutes");
const vehicleRoutes = require("./routes/admin.vehicle.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  session({
    secret: "vehicle_rental_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }),
);

// static frontend
app.use(
  express.static(path.join(__dirname, "../frontend"), {
    index: false,
  }),
);

// uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// routes
app.use("/api", userRoutes);
app.use("/api/vehicles", vehicleRoutes);

// homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/HOME/homepage.html"));
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
