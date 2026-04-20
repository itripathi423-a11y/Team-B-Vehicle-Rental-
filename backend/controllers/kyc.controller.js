const db = require("../config/db");

// ───────── USER INFO ─────────
exports.getUserInfo = (req, res) => {
  const userId = req.session?.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  db.query(
    "SELECT id, name, email, phone FROM users WHERE id=?",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ success: false });

      res.json({ success: true, data: result[0] });
    },
  );
};

// ───────── STATUS ─────────
exports.getKycStatus = (req, res) => {
  const userId = req.session?.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false });
  }

  db.query(
    "SELECT * FROM kyc WHERE user_id=? LIMIT 1",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ success: false });

      res.json({ success: true, data: result[0] || null });
    },
  );
};

// ───────── SUBMIT KYC (MULTER) ─────────
exports.submitKyc = (req, res) => {
  const userId = req.session?.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  const { document_type, document_number } = req.body;

  if (!document_type || !document_number) {
    return res.status(400).json({ success: false });
  }

  const front = req.files?.document_front?.[0];
  const back = req.files?.document_back?.[0];
  const selfie = req.files?.selfie?.[0];

  if (!front || !back || !selfie) {
    return res.status(400).json({
      success: false,
      message: "All documents required",
    });
  }

  const frontPath = `/uploads/kyc/${front.filename}`;
  const backPath = `/uploads/kyc/${back.filename}`;
  const selfiePath = `/uploads/kyc/${selfie.filename}`;

  // check existing
  db.query("SELECT id FROM kyc WHERE user_id=?", [userId], (err, existing) => {
    if (err) return res.status(500).json({ success: false });

    if (existing.length) {
      db.query(
        `UPDATE kyc SET 
            document_type=?,
            document_number=?,
            document_front=?,
            document_back=?,
            selfie=?,
            status='pending',
            submitted_at=NOW()
          WHERE user_id=?`,
        [
          document_type,
          document_number,
          frontPath,
          backPath,
          selfiePath,
          userId,
        ],
        (err2) => {
          if (err2) return res.status(500).json({ success: false });

          res.json({
            success: true,
            message: "KYC updated",
            ref: `KYC-${existing[0].id}`,
          });
        },
      );
    } else {
      db.query(
        `INSERT INTO kyc (
            user_id, document_type, document_number,
            document_front, document_back, selfie,
            status, submitted_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [
          userId,
          document_type,
          document_number,
          frontPath,
          backPath,
          selfiePath,
        ],
        (err2, result) => {
          if (err2) return res.status(500).json({ success: false });

          res.json({
            success: true,
            message: "KYC submitted",
            ref: `KYC-${result.insertId}`,
          });
        },
      );
    }
  });
};
