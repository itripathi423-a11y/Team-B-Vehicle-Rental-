"use strict";

const db = require("../config/db");
const path = require("path");
const fs = require("fs");

// ── promisified query helper ───────────────────────────────────
function query(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) =>
      err ? reject(err) : resolve(result),
    ),
  );
}

// ── GET ALL ────────────────────────────────────────────────────
exports.getAllPackages = async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        tp.*,
        v.name          AS vehicle_name,
        v.body_type     AS vehicle_body_type,
        v.license_plate AS vehicle_license_plate
      FROM   tour_packages tp
      LEFT JOIN vehicles v ON tp.vehicle_id = v.id
      ORDER  BY tp.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[tour] getAllPackages:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET ONE ────────────────────────────────────────────────────
exports.getPackageById = async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT
        tp.*,
        v.name          AS vehicle_name,
        v.body_type     AS vehicle_body_type,
        v.license_plate AS vehicle_license_plate
      FROM   tour_packages tp
      LEFT JOIN vehicles v ON tp.vehicle_id = v.id
      WHERE  tp.id = ?
    `,
      [req.params.id],
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("[tour] getPackageById:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE ─────────────────────────────────────────────────────
exports.createPackage = async (req, res) => {
  try {
    const { title, description, duration_days, price, vehicle_id, is_active } =
      req.body;

    if (!title?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    if (!duration_days || parseInt(duration_days) < 1)
      return res
        .status(400)
        .json({ success: false, message: "Duration must be at least 1 day" });
    if (!price || parseFloat(price) <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Price must be greater than 0" });

    const imageFile = req.file?.filename || null;

    const result = await query(
      `INSERT INTO tour_packages
         (title, description, duration_days, price, image_url, vehicle_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        description?.trim() || null,
        parseInt(duration_days),
        parseFloat(price),
        imageFile,
        vehicle_id ? parseInt(vehicle_id) : null,
        is_active !== undefined ? parseInt(is_active) : 1,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Package created successfully",
      id: result.insertId,
    });
  } catch (err) {
    console.error("[tour] createPackage:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE ─────────────────────────────────────────────────────
exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, duration_days, price, vehicle_id, is_active } =
      req.body;

    if (!title?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    if (!duration_days || parseInt(duration_days) < 1)
      return res
        .status(400)
        .json({ success: false, message: "Duration must be at least 1 day" });
    if (!price || parseFloat(price) <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Price must be greater than 0" });

    // Delete old image if a new one was uploaded
    if (req.file) {
      const existing = await query(
        "SELECT image_url FROM tour_packages WHERE id = ?",
        [id],
      );
      if (existing.length && existing[0].image_url) {
        const oldPath = path.join(
          __dirname,
          "../../uploads/tours",
          existing[0].image_url,
        );
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    const setClauses = [
      "title = ?",
      "description = ?",
      "duration_days = ?",
      "price = ?",
      "vehicle_id = ?",
      "is_active = ?",
    ];
    const values = [
      title.trim(),
      description?.trim() || null,
      parseInt(duration_days),
      parseFloat(price),
      vehicle_id ? parseInt(vehicle_id) : null,
      is_active !== undefined ? parseInt(is_active) : 1,
    ];

    if (req.file) {
      setClauses.push("image_url = ?");
      values.push(req.file.filename);
    }

    values.push(id);

    const result = await query(
      `UPDATE tour_packages SET ${setClauses.join(", ")} WHERE id = ?`,
      values,
    );

    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });

    res.json({ success: true, message: "Package updated successfully" });
  } catch (err) {
    console.error("[tour] updatePackage:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE ─────────────────────────────────────────────────────
exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    // Remove image file from disk first
    const rows = await query(
      "SELECT image_url FROM tour_packages WHERE id = ?",
      [id],
    );
    if (rows.length && rows[0].image_url) {
      const imgPath = path.join(
        __dirname,
        "../../uploads/tours",
        rows[0].image_url,
      );
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    const result = await query("DELETE FROM tour_packages WHERE id = ?", [id]);
    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });

    res.json({ success: true, message: "Package deleted successfully" });
  } catch (err) {
    console.error("[tour] deletePackage:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── TOGGLE ACTIVE ──────────────────────────────────────────────
exports.toggleActive = async (req, res) => {
  try {
    const result = await query(
      "UPDATE tour_packages SET is_active = NOT is_active WHERE id = ?",
      [req.params.id],
    );
    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });

    res.json({ success: true, message: "Package status toggled" });
  } catch (err) {
    console.error("[tour] toggleActive:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
