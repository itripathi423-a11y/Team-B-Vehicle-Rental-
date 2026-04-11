require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// serve images
app.use("/uploads", express.static("uploads"));
const vehicleRoutes = require("./routes/admin.vehicle.routes");

app.use("/api/vehicles", vehicleRoutes);

module.exports = app;
