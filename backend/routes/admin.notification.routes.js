const express = require("express");
const router = express.Router();

const controller = require("../controllers/admin.notification.controller");

// get all notifications
router.get("/", controller.getAdminNotifications);

// unread count
router.get("/unread-count", controller.getAdminUnreadCount);

// mark all read
router.patch("/read-all", controller.markAdminAllRead);

// mark single read
router.patch("/:id/read", controller.markAdminOneRead);

module.exports = router;
