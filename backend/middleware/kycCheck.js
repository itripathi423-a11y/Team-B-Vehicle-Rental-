const db = require("../config/db");

module.exports = (req, res, next) => {
  const userId = req.body.user_id;

  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "user_id is required" });
  }

  const sql = `SELECT status FROM kyc WHERE user_id = ? LIMIT 1`;

  db.query(sql, [userId], (err, result) => {
    if (err)
      return res.status(500).json({ success: false, message: "DB error" });

    if (!result.length || result[0].status !== "verified") {
      return res.status(403).json({
        success: false,
        message: result.length
          ? `KYC not verified (status: ${result[0].status}). Please complete KYC first.`
          : "KYC not submitted. Please complete KYC before booking.",
      });
    }

    next();
  });
};
