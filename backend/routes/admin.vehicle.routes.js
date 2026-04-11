const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");

const controller = require("../controllers/admin.vehicle.controllers");

// ───────── AUTO CREATE UPLOAD FOLDER ─────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/vehicles/";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

const uploadFields = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "image_1", maxCount: 1 },
  { name: "image_2", maxCount: 1 },
  { name: "image_3", maxCount: 1 },
  { name: "image_4", maxCount: 1 },
  { name: "image_5", maxCount: 1 },
]);

// ───────── ROUTES ─────────
router.get("/", controller.getVehicles);
router.get("/stats", controller.getStats);
router.get("/:id", controller.getVehicleById);

router.post("/", uploadFields, controller.createVehicle);
router.put("/:id", uploadFields, controller.updateVehicle);

router.patch("/:id/status", controller.updateStatus);
router.delete("/:id", controller.deleteVehicle);

module.exports = router;
