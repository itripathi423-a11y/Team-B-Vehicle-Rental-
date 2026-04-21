const db = require("../config/db");

// ───────── GET ALL KYC (FRONTEND READY) ─────────
exports.getAllKyc = (req, res) => {
  const sql = `
    SELECT 
      k.id,
      k.document_type,
      k.document_number,
      k.document_front,
      k.document_back,
      k.selfie,
      k.status,
      k.rejection_reason,
      k.submitted_at,
      u.name  AS user_name,
      u.email AS user_email,
      u.phone
    FROM kyc k
    LEFT JOIN users u ON k.user_id = u.id
    ORDER BY k.submitted_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("getAllKyc error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }

    const BASE = "http://localhost:5000";

    const formatted = results.map((k) => {
      // ── submitted_at ──
      // mysql2 returns DATE columns as JS Date objects; handle both cases
      let submitted = "";
      if (k.submitted_at) {
        const d =
          k.submitted_at instanceof Date
            ? k.submitted_at
            : new Date(k.submitted_at);
        submitted = d.toISOString().split("T")[0]; // "YYYY-MM-DD"
      }

      // ── document_type label ──
      // DB stores 'Citizenship' | 'Passport' | 'License'
      // Frontend filter expects 'Citizenship' | 'Passport' | 'Driving License'
      const DOC_TYPE_MAP = {
        Citizenship: "Citizenship",
        Passport: "Passport",
        License: "Driving License",
      };
      const doc_type = DOC_TYPE_MAP[k.document_type] || k.document_type;

      // ── image helpers ──
      const toUrl = (p) => (p ? `${BASE}${p}` : "");

      return {
        id: k.id,
        user_name: k.user_name || "Unknown",
        user_email: k.user_email || "",
        phone: k.phone || "",

        // selfie as profile photo; falls back to empty so frontend shows initials
        photo: toUrl(k.selfie),

        status: k.status || "not_submitted",
        doc_type,
        doc_number: k.document_number || "",

        front_img: toUrl(k.document_front),
        back_img: toUrl(k.document_back),

        submitted,

        reason: k.rejection_reason || "",
        address: "—", // not in schema; keep placeholder
      };
    });

    res.json({ success: true, data: formatted });
  });
};

// ───────── UPDATE STATUS ─────────
exports.updateKycStatus = (req, res) => {
  const { id } = req.params;
  const { status, rejection_reason } = req.body;

  // Map frontend label back to DB enum if needed
  const STATUS_MAP = {
    not_submitted: "not_submitted",
    pending: "pending",
    verified: "verified",
    rejected: "rejected",
  };

  const dbStatus = STATUS_MAP[status];
  if (!dbStatus) {
    return res
      .status(400)
      .json({ success: false, message: `Invalid status: ${status}` });
  }

  const sql = `
    UPDATE kyc 
    SET 
      status           = ?,
      rejection_reason = ?,
      reviewed_at      = NOW()
    WHERE id = ?
  `;

  db.query(sql, [dbStatus, rejection_reason || null, id], (err, result) => {
    if (err) {
      console.error("updateKycStatus error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: `KYC #${id} not found` });
    }

    res.json({ success: true, message: "KYC status updated" });
  });
};
