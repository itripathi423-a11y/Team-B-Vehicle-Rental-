const db = require("../config/db");

exports.getVehicles = (req, res) => {
  const limit = parseInt(req.query.limit) || 3;

  const sql = `
    SELECT 
      id, name, fuel_type, body_type,
      transmission, seating_capacity,
      price_4h, price_8h, price_1d,
      thumbnail
    FROM vehicles
    WHERE status='Available' AND is_deleted=0
    ORDER BY created_at DESC
    LIMIT ?
  `;

  db.query(sql, [limit], (err, results) => {
    if (err) return res.status(500).json({ message: "Vehicle error" });
    res.json(results);
  });
};
