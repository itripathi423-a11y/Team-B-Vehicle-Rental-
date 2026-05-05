// controllers/admin.notification.controller.js
// ADMIN-SIDE notifications — writes to `admin_notifications` table

const db = require("../config/db");

// ── Safe socket emit to admin_room ──────────────────────────────────────
function tryEmitAdmin(payload) {
  try {
    const { getIO } = require("../socket");
    getIO().to("admin_room").emit("admin_notification", payload);
  } catch (e) {
    console.warn("[AdminNotif] Socket emit skipped:", e.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   createAdminNotification({ title, message, type, ref_id, ref_type, meta })

   Called by:
    - booking.controller.js  (user creates new booking → notify admin)
    - admin.bookings.controller.js  (admin changes status → log for other admins)
    - admin.kyc.controller.js  (admin verifies/rejects → log for other admins)
    - enquiry.controller.js  (user submits enquiry → notify admin)
    - reviewController.js  (user submits review → notify admin)

   type: 'booking' | 'kyc' | 'enquiry' | 'review' | 'general'
════════════════════════════════════════════════════════════════════════ */
exports.createAdminNotification = ({
  title,
  message,
  type = "general",
  ref_id = null,
  ref_type = null,
  meta = null,
}) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO admin_notifications
        (title, message, type, ref_id, ref_type, meta, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, NOW())
    `;

    db.query(
      sql,
      [
        title,
        message,
        type,
        ref_id,
        ref_type,
        meta ? JSON.stringify(meta) : null,
      ],
      (err, result) => {
        if (err) {
          console.error("[AdminNotif] DB insert error:", err);
          return reject(err);
        }

        const notifId = result.insertId;

        tryEmitAdmin({
          id: notifId,
          title,
          message,
          type,
          ref_id,
          ref_type,
          meta,
          is_read: 0,
          created_at: new Date().toISOString(),
        });

        resolve(notifId);
      },
    );
  });
};

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/admin/notifications?limit=20&offset=0
════════════════════════════════════════════════════════════════════════ */
exports.getAdminNotifications = (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = parseInt(req.query.offset) || 0;

  const countSql = `
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) AS unread
    FROM admin_notifications
  `;

  const listSql = `
    SELECT id, title, message, type, ref_id, ref_type, meta, is_read, created_at
    FROM admin_notifications
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countSql, (err, countRows) => {
    if (err)
      return res.status(500).json({ success: false, message: "DB error" });

    db.query(listSql, [limit, offset], (err2, rows) => {
      if (err2)
        return res.status(500).json({ success: false, message: "DB error" });

      res.json({
        success: true,
        total: countRows[0].total,
        unread: countRows[0].unread || 0,
        notifications: rows.map((n) => ({
          ...n,
          meta: n.meta ? JSON.parse(n.meta) : null,
        })),
      });
    });
  });
};

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/admin/notifications/unread-count
════════════════════════════════════════════════════════════════════════ */
exports.getAdminUnreadCount = (req, res) => {
  db.query(
    "SELECT COUNT(*) AS count FROM admin_notifications WHERE is_read = 0",
    (err, result) => {
      if (err)
        return res.status(500).json({ success: false, message: "DB error" });
      res.json({ success: true, count: result[0].count });
    },
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   PATCH /api/admin/notifications/read-all   ← register BEFORE /:id/read
════════════════════════════════════════════════════════════════════════ */
exports.markAdminAllRead = (req, res) => {
  db.query(
    "UPDATE admin_notifications SET is_read = 1 WHERE is_read = 0",
    (err) => {
      if (err)
        return res.status(500).json({ success: false, message: "DB error" });
      res.json({ success: true, message: "All marked as read" });
    },
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   PATCH /api/admin/notifications/:id/read
════════════════════════════════════════════════════════════════════════ */
exports.markAdminOneRead = (req, res) => {
  db.query(
    "UPDATE admin_notifications SET is_read = 1 WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err)
        return res.status(500).json({ success: false, message: "DB error" });
      if (result.affectedRows === 0)
        return res.status(404).json({ success: false, message: "Not found" });
      res.json({ success: true, message: "Marked as read" });
    },
  );
};
