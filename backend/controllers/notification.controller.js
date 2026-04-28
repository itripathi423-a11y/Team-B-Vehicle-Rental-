const db = require("../config/db");

exports.getUnreadCount = (req, res) => {
  const userId = req.user.id;

  db.query(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND is_read=0",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB Error" });

      res.json({
        count: result[0].count,
      });
    },
  );
};

exports.sendNotification = (req, res) => {
  const { user_id, title, message } = req.body;

  const io = req.app.get("io");

  db.query(
    "INSERT INTO notifications(user_id,title,message) VALUES(?,?,?)",
    [user_id, title, message],
    (err) => {
      if (err) return res.status(500).json({ message: "Insert failed" });

      db.query(
        "SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND is_read=0",
        [user_id],
        (err2, result) => {
          const count = result[0].count;

          io.to(`user_${user_id}`).emit("notification_count", {
            count,
          });

          res.json({
            message: "Notification sent",
          });
        },
      );
    },
  );
};
