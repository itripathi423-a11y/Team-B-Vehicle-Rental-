const db = require("../config/db");

const User = {
  findByEmail: (email, cb) => {
    db.query("SELECT * FROM users WHERE email = ?", [email], cb);
  },

  create: (data, cb) => {
    db.query(
      "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
      [data.name, data.email, data.phone, data.password, data.role],
      cb,
    );
  },

  findById: (id, cb) => {
    db.query("SELECT * FROM users WHERE id = ?", [id], cb);
  },
};

module.exports = User;
