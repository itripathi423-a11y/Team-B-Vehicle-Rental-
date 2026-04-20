const db = require("../config/db");
const path = require("path");
const fs = require("fs");

// GET /api/kyc/user-info
exports.getUserInfo = (req, res) => {
  const userId = req.session?.user?.id; // ← fixed

  if (!userId) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  const sql = `SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1`;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "DB error" });
    }
    if (!result.length) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: result[0] });
  });
};

// GET /api/kyc/status
exports.getKycStatus = (req, res) => {
  const userId = req.session?.user?.id; // ← fixed

  if (!userId) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  const sql = `
    SELECT id, document_type, status, rejection_reason,
           submitted_at, reviewed_at
    FROM kyc
    WHERE user_id = ?
    LIMIT 1
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "DB error" });
    }
    if (!result.length) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: result[0] });
  });
};

// POST /api/kyc/submit
exports.submitKyc = (req, res) => {
  const userId = req.session?.user?.id; // ← fixed

  if (!userId) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  const { document_type, document_number } = req.body;

  if (!document_type || !document_number) {
    return res.status(400).json({
      success: false,
      message: "Document type and number are required",
    });
  }

  if (
    !req.files?.document_front ||
    !req.files?.document_back ||
    !req.files?.selfie
  ) {
    return res.status(400).json({
      success: false,
      message:
        "All three files are required: document_front, document_back, selfie",
    });
  }

  // Create upload dir if needed
  const uploadDir = path.join(__dirname, "../../uploads/kyc");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  function saveFile(fileObj, prefix) {
    const ext = path.extname(fileObj.name) || ".jpg";
    const filename = `${prefix}_${userId}_${Date.now()}${ext}`;
    const filepath = path.join(uploadDir, filename);
    fileObj.mv(filepath);
    return `/uploads/kyc/${filename}`;
  }

  const frontPath = saveFile(req.files.document_front, "front");
  const backPath = saveFile(req.files.document_back, "back");
  const selfiePath = saveFile(req.files.selfie, "selfie");

  // Check if KYC already exists
  db.query(
    `SELECT id FROM kyc WHERE user_id = ? LIMIT 1`,
    [userId],
    (err, existing) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "DB error" });
      }

      if (existing.length) {
        // UPDATE existing
        const updateSql = `
        UPDATE kyc SET
          document_type    = ?,
          document_number  = ?,
          document_front   = ?,
          document_back    = ?,
          selfie           = ?,
          status           = 'pending',
          rejection_reason = NULL,
          submitted_at     = NOW(),
          reviewed_at      = NULL
        WHERE user_id = ?
      `;
        db.query(
          updateSql,
          [
            document_type,
            document_number,
            frontPath,
            backPath,
            selfiePath,
            userId,
          ],
          (err2) => {
            if (err2) {
              console.error(err2);
              return res
                .status(500)
                .json({ success: false, message: "Update failed" });
            }
            res.json({
              success: true,
              message: "KYC re-submitted",
              ref: `KYC-${existing[0].id}`,
            });
          },
        );
      } else {
        // INSERT new
        const insertSql = `
        INSERT INTO kyc (
          user_id, document_type, document_number,
          document_front, document_back, selfie,
          status, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
      `;
        db.query(
          insertSql,
          [
            userId,
            document_type,
            document_number,
            frontPath,
            backPath,
            selfiePath,
          ],
          (err2, result2) => {
            if (err2) {
              console.error(err2);
              return res
                .status(500)
                .json({ success: false, message: "Insert failed" });
            }
            res.json({
              success: true,
              message: "KYC submitted",
              ref: `KYC-${result2.insertId}`,
            });
          },
        );
      }
    },
  );
};
