// Import Express framework
const express = require("express");

// Create router instance
const router = express.Router();

// Import multer for file uploads
const multer = require("multer");

// Import file system module (used to create folders)
const fs = require("fs");

// Import vehicle controller functions
const controller = require("../controllers/admin.vehicle.controllers");

// ───────── AUTO CREATE UPLOAD FOLDER ─────────

// Configure storage settings for uploaded files
const storage = multer.diskStorage({
  // Set destination folder for uploads
  destination: (req, file, cb) => {
    const dir = "uploads/vehicles/";

    // Check if folder exists, if not create it
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Set upload directory
    cb(null, dir);
  },

  // Define uploaded file naming format
  filename: (req, file, cb) => {
    // Add timestamp to avoid duplicate names
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Initialize multer with storage config
const upload = multer({ storage });

// Define multiple file upload fields
const uploadFields = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "image_1", maxCount: 1 },
  { name: "image_2", maxCount: 1 },
  { name: "image_3", maxCount: 1 },
  { name: "image_4", maxCount: 1 },
  { name: "image_5", maxCount: 1 },
]);

// ───────── ROUTES ─────────

// Get all vehicles
router.get("/", controller.getVehicles);

// Get vehicle statistics
router.get("/stats", controller.getStats);

// Get single vehicle by ID
router.get("/:id", controller.getVehicleById);

// Create new vehicle (with file upload support)
router.post("/", uploadFields, controller.createVehicle);

// Update vehicle (with file upload support)
router.put("/:id", uploadFields, controller.updateVehicle);

// Soft delete or restore vehicle status
router.patch("/:id/status", controller.updateStatus);

// Permanently delete vehicle
router.delete("/:id", controller.deleteVehicle);

// Export router to use in main server
module.exports = router;
