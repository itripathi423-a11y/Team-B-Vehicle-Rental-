const db = require("../config/db");

// GET /api/tour-packages
exports.getAllPackages = (req, res) => {
  const sql = `
    SELECT
      tp.id,
      tp.title,
      tp.description,
      tp.duration_days,
      tp.price,
      tp.image_url,
      tp.is_active,
      tp.created_at,

      v.id AS vehicle_id,
      v.name AS vehicle_name,
      v.brand,
      v.model,
      v.thumbnail

    FROM tour_packages tp

    LEFT JOIN vehicles v
      ON tp.vehicle_id = v.id

    WHERE tp.is_active = 1
    ORDER BY tp.id ASC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("getAllPackages error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }

    res.json({
      success: true,
      data: rows,
    });
  });
};

// GET /api/tour-packages/:id
exports.getPackageById = (req, res) => {
  const sql = `
    SELECT
      tp.id,
      tp.title,
      tp.description,
      tp.duration_days,
      tp.price,
      tp.image_url,
      tp.is_active,
      tp.created_at,

      v.id AS vehicle_id,
      v.name AS vehicle_name,
      v.brand,
      v.model,
      v.thumbnail,
      v.price_1d,
      v.seating_capacity,
      v.fuel_type,
      v.transmission

    FROM tour_packages tp

    LEFT JOIN vehicles v
      ON tp.vehicle_id = v.id

    WHERE tp.id = ?
      AND tp.is_active = 1
  `;

  db.query(sql, [req.params.id], (err, rows) => {
    if (err) {
      console.error("getPackageById error:", err);

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  });
};

// POST /api/tour-packages
exports.createPackage = (req, res) => {
  const {
    title,
    vehicle_id,
    description,
    duration_days,
    price,
    image_url,
    is_active,
  } = req.body;

  if (!title || !duration_days || !price) {
    return res.status(400).json({
      success: false,
      message: "title, duration_days, and price are required",
    });
  }

  const sql = `
    INSERT INTO tour_packages
    (
      title,
      vehicle_id,
      description,
      duration_days,
      price,
      image_url,
      is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      title,
      vehicle_id || null,
      description || null,
      duration_days,
      price,
      image_url || null,
      is_active !== undefined ? is_active : 1,
    ],
    (err, result) => {
      if (err) {
        console.error("createPackage error:", err);

        return res.status(500).json({
          success: false,
          message: "Server error",
        });
      }

      res.status(201).json({
        success: true,
        message: "Package created",
        id: result.insertId,
      });
    },
  );
};

// PUT /api/tour-packages/:id
exports.updatePackage = (req, res) => {
  db.query(
    "SELECT id FROM tour_packages WHERE id = ?",
    [req.params.id],
    (err, existing) => {
      if (err) {
        console.error("updatePackage error:", err);

        return res.status(500).json({
          success: false,
          message: "Server error",
        });
      }

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      const {
        title,
        vehicle_id,
        description,
        duration_days,
        price,
        image_url,
        is_active,
      } = req.body;

      const sql = `
        UPDATE tour_packages
        SET
          title = COALESCE(?, title),
          vehicle_id = COALESCE(?, vehicle_id),
          description = COALESCE(?, description),
          duration_days = COALESCE(?, duration_days),
          price = COALESCE(?, price),
          image_url = COALESCE(?, image_url),
          is_active = COALESCE(?, is_active)
        WHERE id = ?
      `;

      db.query(
        sql,
        [
          title ?? null,
          vehicle_id ?? null,
          description ?? null,
          duration_days ?? null,
          price ?? null,
          image_url ?? null,
          is_active ?? null,
          req.params.id,
        ],
        (err2) => {
          if (err2) {
            console.error("updatePackage error:", err2);

            return res.status(500).json({
              success: false,
              message: "Server error",
            });
          }

          res.json({
            success: true,
            message: "Package updated",
          });
        },
      );
    },
  );
};

// DELETE /api/tour-packages/:id
exports.deletePackage = (req, res) => {
  db.query(
    "SELECT id FROM tour_packages WHERE id = ?",
    [req.params.id],
    (err, existing) => {
      if (err) {
        console.error("deletePackage error:", err);

        return res.status(500).json({
          success: false,
          message: "Server error",
        });
      }

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      db.query(
        "UPDATE tour_packages SET is_active = 0 WHERE id = ?",
        [req.params.id],
        (err2) => {
          if (err2) {
            console.error("deletePackage error:", err2);

            return res.status(500).json({
              success: false,
              message: "Server error",
            });
          }

          res.json({
            success: true,
            message: "Package deleted",
          });
        },
      );
    },
  );
};
