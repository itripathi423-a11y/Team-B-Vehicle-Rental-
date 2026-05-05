// routes/notificationRoutes.js  — COMPLETE FILE

const express = require("express");
const router = express.Router();
const notifCtrl = require("../controllers/notification.controller");

/* ── Session auth guard (same pattern as your booking routes) ── */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please log in.",
    });
  }
  next();
}

// GET  /api/user/notifications                — list with pagination
router.get("/", requireAuth, notifCtrl.getUserNotifications);

// GET  /api/user/notifications/unread-count   — badge count on page load
router.get("/unread-count", requireAuth, notifCtrl.getUnreadCount);

// PATCH /api/user/notifications/read-all      — mark all read
// NOTE: must be registered BEFORE /:id/read to avoid route conflict
router.patch("/read-all", requireAuth, notifCtrl.markAllRead);

// PATCH /api/user/notifications/:id/read      — mark one read
router.patch("/:id/read", requireAuth, notifCtrl.markOneRead);

module.exports = router;
