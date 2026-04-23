// Import database connection
const db = require("../config/db");

// ───────── GET ALL ─────────
exports.getVehicles = (req, res) => {
  const { deleted } = req.query;

  let sql;

  if (deleted === "only") {
    sql = "SELECT * FROM vehicles WHERE is_deleted = 1";
  } else {
    sql = "SELECT * FROM vehicles WHERE is_deleted = 0";
  }

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false, message: err.message });
    }

    res.json({ success: true, data: result });
  });
};

// ───────── GET ONE ─────────
exports.getVehicleById = (req, res) => {
  db.query(
    "SELECT * FROM vehicles WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: err.message });
      }

      res.json({ success: true, data: result[0] });
    },
  );
};

// ───────── CREATE ─────────
exports.createVehicle = (req, res) => {
  const v = req.body;

  // ✅ FIX: features must be JSON
  const features = Array.isArray(v.features)
    ? JSON.stringify(v.features)
    : JSON.stringify(v.features ? [v.features] : []);

  const sql = `
    INSERT INTO vehicles 
    (name, brand, model, year, license_plate, body_type, fuel_type, transmission,
     seating_capacity, price_4h, price_8h, price_1d, status, description, color,
     features, last_service_date,
     thumbnail, image_1, image_2, image_3, image_4, image_5)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

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
    v.status || "Available",
    v.description || null,
    v.color || null,
    features,
    v.last_service_date || null, // ✅ NEW
    req.files?.thumbnail?.[0]?.filename || null,
    req.files?.image_1?.[0]?.filename || null,
    req.files?.image_2?.[0]?.filename || null,
    req.files?.image_3?.[0]?.filename || null,
    req.files?.image_4?.[0]?.filename || null,
    req.files?.image_5?.[0]?.filename || null,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false, message: err.message });
    }

    res.json({
      success: true,
      message: "Vehicle added successfully",
      id: result.insertId,
    });
  });
};

// ───────── UPDATE VEHICLE ─────────
exports.updateVehicle = (req, res) => {
  const { id } = req.params;
  const v = req.body;

  // ✅ FIX: features JSON safe
  const features = Array.isArray(v.features)
    ? JSON.stringify(v.features)
    : JSON.stringify(v.features ? [v.features] : []);

  const sql = `
  UPDATE vehicles SET
    name=?, brand=?, model=?, year=?, license_plate=?,
    body_type=?, fuel_type=?, transmission=?, seating_capacity=?,
    price_4h=?, price_8h=?, price_1d=?, status=?, description=?,
    color=?, features=?,
    last_service_date=?, service_status=?
  WHERE id=?
`;

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
    v.color || null,
    features,
    v.last_service_date || null,
    v.service_status || "Serviced",
    id,
  ];

  db.query(sql, values, (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false, message: err.message });
    }

    res.json({
      success: true,
      message: "Vehicle updated successfully",
    });
  });
};
// ───────── SOFT DELETE / RESTORE ─────────
exports.updateStatus = (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  let sql;

  if (action === "soft_delete") {
    sql = "UPDATE vehicles SET is_deleted = 1 WHERE id = ?";
  } else if (action === "restore") {
    sql = "UPDATE vehicles SET is_deleted = 0 WHERE id = ?";
  } else {
    return res.status(400).json({ success: false, message: "Invalid action" });
  }

  db.query(sql, [id], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false });
    }

    res.json({ success: true, message: "Status updated" });
  });
};

// ───────── DELETE ─────────
exports.deleteVehicle = (req, res) => {
  db.query("DELETE FROM vehicles WHERE id = ?", [req.params.id], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false });
    }

    res.json({
      success: true,
      message: "Vehicle deleted permanently",
    });
  });
};

// ───────── STATS ─────────
exports.getStats = (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status='Available' AND is_deleted=0 THEN 1 ELSE 0 END) AS available,
      SUM(CASE WHEN status='Booked' AND is_deleted=0 THEN 1 ELSE 0 END) AS booked,
      SUM(CASE WHEN is_deleted=1 THEN 1 ELSE 0 END) AS hidden
    FROM vehicles
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false });
    }

    res.json({ success: true, data: result[0] });
  });
};
