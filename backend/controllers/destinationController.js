const db = require("../config/db");

exports.getDestinations = (req, res) => {
  const sql = `
    SELECT id, name, image_url
    FROM destinations
    WHERE is_active = 1
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Destination fetch error",
      });
    }

    res.status(200).json({
      success: true,
      data: results,
    });
  });
};
