const express = require("express");
const router = express.Router();
const controller = require("../controllers/notification.controller");

router.get("/user/notifications/unread-count", controller.getUnreadCount);
router.post("/admin/send-notification", controller.sendNotification);

module.exports = router;
