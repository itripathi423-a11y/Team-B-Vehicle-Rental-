const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const vehicleRoutes = require("./routes/admin.vehicle.routes");

const app = express();

app.use(cors());
app.use(express.json());

// IMPORTANT: serve uploaded images
app.use("/uploads", express.static("uploads"));

// frontend
app.use(express.static("frontend"));

// routes
app.use("/api", userRoutes);
app.use("/api/vehicles", vehicleRoutes);

// MUST match frontend (your frontend uses 5000)
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
