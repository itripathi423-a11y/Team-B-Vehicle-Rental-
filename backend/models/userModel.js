const db = require("../config/db");

const findUserByEmail = (email, callback) => {
  db.query("SELECT * FROM users WHERE email = ?", [email], callback);
};

const createUser = (user, callback) => {
  const { name, email, phone, password } = user;

  db.query(
    "INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)",
    [name, email, phone, password],
    callback,
  );
};

module.exports = {
  findUserByEmail,
  createUser,
};
