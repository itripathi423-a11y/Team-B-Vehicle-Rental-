// Import database connection
const db = require("../config/db");

// ───────── GET ALL ─────────

// Get all vehicles (active or deleted based on query)
exports.getVehicles = (req, res) => {
  // Read query parameter ?deleted=only
  const { deleted } = req.query;

  let sql;

  // If only deleted vehicles requested
  if (deleted === "only") {
    sql = "SELECT * FROM vehicles WHERE is_deleted = 1";
  } else {
    // Default: fetch only active vehicles
    sql = "SELECT * FROM vehicles WHERE is_deleted = 0";
  }

  // Execute SQL query
  db.query(sql, (err, result) => {
    // Handle DB error
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false, message: err.message });
    }

    // Return vehicles list
    res.json({ success: true, data: result });
  });
};

// ───────── GET ONE ─────────

// Get single vehicle by ID
exports.getVehicleById = (req, res) => {
  // Query vehicle by id from URL parameter
  db.query(
    "SELECT * FROM vehicles WHERE id = ?",
    [req.params.id],
    (err, result) => {
      // Handle error
      if (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: err.message });
      }

      // Return single vehicle object
      res.json({ success: true, data: result[0] });
    },
  );
};

// ───────── CREATE ─────────

// Create new vehicle
exports.createVehicle = (req, res) => {
  // Get vehicle data from request body
  const v = req.body;

  // SQL insert query
  const sql = `
    INSERT INTO vehicles 
    (name, brand, model, year, license_plate, body_type, fuel_type, transmission,
     seating_capacity, price_4h, price_8h, price_1d, status, description,
     thumbnail, image_1, image_2, image_3, image_4, image_5)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  // Values mapped from request body and uploaded files
  const values = [
    v.name,
    v.brand,
    v.model,
    v.year,
    v.license_plate,
    v.body_type,
    v.fuel_type,
    v.transmission,
    v.seating_capacity,
    v.price_4h,
    v.price_8h,
    v.price_1d,

    v.status || "Available", // default status if not provided

    v.description || null,

    req.files?.thumbnail?.[0]?.filename || null,
    req.files?.image_1?.[0]?.filename || null,
    req.files?.image_2?.[0]?.filename || null,
    req.files?.image_3?.[0]?.filename || null,
    req.files?.image_4?.[0]?.filename || null,
    req.files?.image_5?.[0]?.filename || null,
  ];

  // Execute insert query
  db.query(sql, values, (err, result) => {
    // Handle error
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false, message: err.message });
    }

    // Return success response with inserted ID
    res.json({
      success: true,
      message: "Vehicle added successfully",
      id: result.insertId,
    });
  });
};

// ───────── UPDATE VEHICLE ─────────

// Update existing vehicle
exports.updateVehicle = (req, res) => {
  // Get vehicle ID from URL
  const { id } = req.params;

  // Get updated data
  const v = req.body;

  // SQL update query
  const sql = `
    UPDATE vehicles SET
      name=?,
      brand=?,
      model=?,
      year=?,
      license_plate=?,
      body_type=?,
      fuel_type=?,
      transmission=?,
      seating_capacity=?,
      price_4h=?,
      price_8h=?,
      price_1d=?,
      status=?,          
      description=?
    WHERE id=?
  `;

  // Values for update query
  const values = [
    v.name,
    v.brand,
    v.model,
    v.year,
    v.license_plate,
    v.body_type,
    v.fuel_type,
    v.transmission,
    v.seating_capacity,
    v.price_4h,
    v.price_8h,
    v.price_1d,
    v.status,
    v.description || null,
    id,
  ];

  // Execute update query
  db.query(sql, values, (err) => {
    // Handle error
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false, message: err.message });
    }

    // Success response
    res.json({ success: true, message: "Vehicle updated successfully" });
  });
};

// ───────── SOFT DELETE / RESTORE ─────────

// Soft delete or restore vehicle
exports.updateStatus = (req, res) => {
  // Get vehicle ID
  const { id } = req.params;

  // Action type from request body
  const { action } = req.body;

  let sql;

  // Soft delete (hide vehicle)
  if (action === "soft_delete") {
    sql = "UPDATE vehicles SET is_deleted = 1 WHERE id = ?";
  }
  // Restore vehicle
  else if (action === "restore") {
    sql = "UPDATE vehicles SET is_deleted = 0 WHERE id = ?";
  }
  // Invalid action
  else {
    return res.status(400).json({ success: false, message: "Invalid action" });
  }

  // Execute status update
  db.query(sql, [id], (err) => {
    // Handle error
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false });
    }

    // Success response
    res.json({ success: true, message: "Status updated" });
  });
};

// ───────── DELETE ─────────

// Permanently delete vehicle
exports.deleteVehicle = (req, res) => {
  // Delete vehicle by ID
  db.query("DELETE FROM vehicles WHERE id = ?", [req.params.id], (err) => {
    // Handle error
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false });
    }

    // Success response
    res.json({
      success: true,
      message: "Vehicle deleted permanently",
    });
  });
};

// ───────── STATS ─────────

// Get vehicle statistics
exports.getStats = (req, res) => {
  // SQL query for stats
  const sql = `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status='Available' AND is_deleted=0 THEN 1 ELSE 0 END) AS available,
      SUM(CASE WHEN status='Booked' AND is_deleted=0 THEN 1 ELSE 0 END) AS booked,
      SUM(CASE WHEN is_deleted=1 THEN 1 ELSE 0 END) AS hidden
    FROM vehicles
  `;

  // Execute query
  db.query(sql, (err, result) => {
    // Handle error
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false });
    }

    // Return stats
    res.json({ success: true, data: result[0] });
  });
};
