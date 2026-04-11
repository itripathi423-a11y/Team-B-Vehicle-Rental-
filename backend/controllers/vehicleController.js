exports.getVehicles = (req, res) => {
  const limit = parseInt(req.query.limit) || 3;

  const sql = `
    SELECT 
      id,
      name,
      fuel_type,
      body_type,
      price_1d AS price,
      thumbnail
    FROM vehicles
    WHERE is_deleted = 0
    ORDER BY created_at DESC
    LIMIT ?
  `;

  db.query(sql, [limit], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false });
    }

    res.json({ success: true, data: results });
  });
};
