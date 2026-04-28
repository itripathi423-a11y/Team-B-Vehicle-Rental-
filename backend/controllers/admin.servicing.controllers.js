const db = require("../config/db");

// GET all vehicles service info
exports.getServiceList = (req, res) => {
  const sql = `
    SELECT 
      id,
      name,
      brand,
      model,
      license_plate,
      body_type,
      thumbnail,
      last_service_date,
      service_status
    FROM vehicles
    WHERE is_deleted = 0
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });

    const mapped = result.map((v) => ({
      id: v.id,
      vehicle_name: v.name,
      vehicle_brand: v.brand,
      vehicle_model: v.model,
      vehicle_plate: v.license_plate || "—",
      vehicle_type: v.body_type || "—",
      thumbnail: v.thumbnail || null,
      servicing_date: v.last_service_date,
      status: mapServiceStatus(v.service_status),
      notes: "—",
    }));

    res.json({ data: mapped });
  });
};

// Map DB service_status enum → frontend status strings
function mapServiceStatus(dbStatus) {
  if (!dbStatus) return "scheduled";
  const map = {
    Serviced: "completed",
    "Needs Service": "overdue",
  };
  return map[dbStatus] || "scheduled";
}

// Map frontend status strings → DB enum
function mapToDbStatus(frontendStatus) {
  const map = {
    completed: "Serviced",
    overdue: "Needs Service",
    scheduled: "Needs Service",
    in_progress: "Needs Service",
    cancelled: "Serviced",
  };
  return map[(frontendStatus || "").toLowerCase()] || "Serviced";
}

// UPDATE service status manually
exports.updateServiceStatus = (req, res) => {
  const { id } = req.params;
  const { status, servicing_date, notes } = req.body;

  const dbStatus = mapToDbStatus(status);
  const dateValue = servicing_date || null;

  const sql = `
    UPDATE vehicles
    SET service_status = ?, last_service_date = ?
    WHERE id = ?
  `;

  db.query(sql, [dbStatus, dateValue, id], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.json({
      message: "Service status updated",
      id,
      status,
      servicing_date: dateValue,
    });
  });
};

// MARK AS SERVICED (quick action)
exports.markServiced = (req, res) => {
  const { id } = req.params;
  const today = new Date().toISOString().slice(0, 10);

  const sql = `
    UPDATE vehicles
    SET service_status = 'Serviced',
        last_service_date = ?
    WHERE id = ?
  `;

  db.query(sql, [today, id], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.json({
      message: "Vehicle marked as serviced",
      id,
      servicing_date: today,
    });
  });
};
