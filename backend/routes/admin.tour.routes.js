const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const ctrl = require("../controllers/admin.tour.controller");

// ── Upload dir ─────────────────────────────────────────────────
const UPLOAD_DIR = "uploads/tours/";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `tour-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Images only (jpeg, png, webp, gif)"));
  },
});

// ── Routes ─────────────────────────────────────────────────────
router.get("/", ctrl.getAllPackages);
router.get("/:id", ctrl.getPackageById);
router.post("/", upload.single("image"), ctrl.createPackage);
router.put("/:id", upload.single("image"), ctrl.updatePackage);
router.delete("/:id", ctrl.deletePackage);
router.patch("/:id/toggle", ctrl.toggleActive);

module.exports = router;
