// controllers/enquiry.controller.js

const db = require("../config/db");
const { createAdminNotification } = require("./admin.notification.controller");

/* ── CREATE ENQUIRY ── */
exports.createEnquiry = (req, res) => {
  const { user_id, name, email, message } = req.body;

  // "message" from frontend maps to "question" column in DB
  const question = (message || "").trim();

  if (!user_id) {
    return res.status(400).json({
      success: false,
      message: "user_id is required",
    });
  }

  if (!question) {
    return res.status(400).json({
      success: false,
      message: "Message / question is required",
    });
  }

  // Verify the user exists and resolve name + email from DB
  const userSql = "SELECT name, email FROM users WHERE id = ?";

  db.query(userSql, [user_id], (err, userResult) => {
    if (err) {
      console.error("DB error fetching user:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    if (!userResult.length) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Prefer DB values; fall back to what the client sent
    const resolvedName = userResult[0].name || name || "";
    const resolvedEmail = userResult[0].email || email || "";

    const insertSql = `
      INSERT INTO enquiries (user_id, name, email, question)
      VALUES (?, ?, ?, ?)
    `;

    db.query(
      insertSql,
      [user_id, resolvedName, resolvedEmail, question],
      async (err, result) => {
        if (err) {
          console.error("DB error inserting enquiry:", err);
          return res
            .status(500)
            .json({ success: false, message: "Failed to save enquiry" });
        }

        const enquiryId = result.insertId;
        const preview =
          question.slice(0, 80) + (question.length > 80 ? "…" : "");

        // ── Notify ADMIN via admin_notifications table + socket ──────
        try {
          await createAdminNotification({
            title: "New Enquiry 💬",
            message: `${resolvedName} submitted an enquiry: "${preview}"`,
            type: "enquiry",
            ref_id: enquiryId,
            ref_type: "enquiry",
            meta: {
              enquiry_id: enquiryId,
              user_id: Number(user_id),
              user_name: resolvedName,
              user_email: resolvedEmail,
              question: question.slice(0, 200),
            },
          });
          console.log("✅ Enquiry admin notification sent, id:", enquiryId);
        } catch (e) {
          console.warn("[createEnquiry] Admin notification error:", e.message);
        }

        res.json({
          success: true,
          message: "Enquiry submitted successfully",
          enquiry_id: enquiryId,
        });
      },
    );
  });
};

/* ── GET ALL ENQUIRIES (admin) ── */
exports.getAllEnquiries = (req, res) => {
  const sql = `
    SELECT
      e.id,
      e.user_id,
      e.name,
      e.email,
      e.question,
      e.status,
      e.admin_reply,
      e.created_at,
      u.name  AS user_name,
      u.email AS user_email
    FROM enquiries e
    JOIN users u ON u.id = e.user_id
    ORDER BY e.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("DB error fetching enquiries:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }
    res.json({ success: true, data: results });
  });
};

/* ── GET ENQUIRIES FOR A SPECIFIC USER ── */
exports.getUserEnquiries = (req, res) => {
  const userId = req.params.userId || req.query.user_id;

  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "user_id is required" });
  }

  const sql = `
    SELECT id, question, status, admin_reply, created_at
    FROM enquiries
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("DB error fetching user enquiries:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }
    res.json({ success: true, data: results });
  });
};

/* ── REPLY TO ENQUIRY (admin) ── */
exports.replyEnquiry = (req, res) => {
  const { id } = req.params;
  const { admin_reply, status } = req.body;

  if (!admin_reply) {
    return res
      .status(400)
      .json({ success: false, message: "admin_reply is required" });
  }

  const allowedStatuses = ["Pending", "Replied", "Closed"];
  const resolvedStatus = allowedStatuses.includes(status) ? status : "Replied";

  const sql = `
    UPDATE enquiries
    SET admin_reply = ?, status = ?
    WHERE id = ?
  `;

  db.query(sql, [admin_reply, resolvedStatus, id], (err, result) => {
    if (err) {
      console.error("DB error replying to enquiry:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Enquiry not found" });
    }
    res.json({ success: true, message: "Reply saved" });
  });
};

/* ── UPDATE ENQUIRY STATUS (admin) ── */
exports.updateEnquiryStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ["Pending", "Replied", "Closed"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `status must be one of: ${allowedStatuses.join(", ")}`,
    });
  }

  db.query(
    "UPDATE enquiries SET status = ? WHERE id = ?",
    [status, id],
    (err, result) => {
      if (err) {
        console.error("DB error updating status:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Enquiry not found" });
      }
      res.json({ success: true, message: "Status updated" });
    },
  );
};
