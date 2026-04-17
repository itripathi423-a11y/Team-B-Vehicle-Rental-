const db = require("../config/db");

const Vehicle = {
  getAll: (cb) => {
    const sql = `
      SELECT * FROM vehicles 
      WHERE status='Available' AND is_deleted=0
      ORDER BY id DESC
      LIMIT 3
    `;
    db.query(sql, cb);
  },
};

module.exports = Vehicle;
