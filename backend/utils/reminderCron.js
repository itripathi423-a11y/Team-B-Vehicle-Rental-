// utils/reminderCron.js
// Checks every 15 minutes for bookings due in ~24h or ~1h and pushes reminders.
// Start once in server.js: require('./utils/reminderCron')

const cron = require("node-cron");
const db = require("../config/db");
const {
  createNotification,
} = require("../controllers/notification.controller");

let isRunning = false;

// ── Run every 15 minutes ──────────────────────────────────────────────────
cron.schedule("*/15 * * * *", () => {
  if (isRunning) {
    console.warn("[Reminder Cron] Previous run still in progress, skipping.");
    return;
  }
  isRunning = true;

  const sql = `
    SELECT
      b.id,
      b.user_id,
      b.booking_ref,
      b.pickup_datetime,
      b.pickup_location,
      TIMESTAMPDIFF(MINUTE, NOW(), b.pickup_datetime) AS mins_left
    FROM bookings b
    WHERE
      b.status IN ('Confirmed', 'Active')
      AND b.pickup_datetime > NOW()
      AND b.pickup_datetime <= DATE_ADD(NOW(), INTERVAL 25 HOUR)
  `;

  db.query(sql, (err, bookings) => {
    if (err) {
      console.error("[Reminder Cron] DB error:", err);
      isRunning = false;
      return;
    }

    const tasks = bookings
      .map((booking) => {
        const mins = booking.mins_left;
        if (mins >= 1380 && mins <= 1500) {
          return tryReminder(booking, 24, "24 hours");
        } else if (mins >= 45 && mins <= 75) {
          return tryReminder(booking, 1, "1 hour");
        }
        return null;
      })
      .filter(Boolean);

    Promise.all(tasks)
      .catch((e) => console.error("[Reminder Cron] Promise.all error:", e))
      .finally(() => {
        isRunning = false;
      });
  });
});

/* ── tryReminder ─────────────────────────────────────────────────────────
   minutesBefore is now stored as hours_before (1 or 24) to avoid
   the TINYINT(3) overflow bug where 1440 wraps to 0.
   The reminder_logs table unique key is (booking_id, minutes_before)
   — we store 1 and 24 which both fit in TINYINT(3) unsigned (max 255).
──────────────────────────────────────────────────────────────────────── */
async function tryReminder(booking, hoursBefore, label) {
  return new Promise((resolve) => {
    // Use hoursBefore (1 or 24) as the dedupe key — both fit in TINYINT
    db.query(
      "SELECT id FROM reminder_logs WHERE booking_id = ? AND minutes_before = ?",
      [booking.id, hoursBefore],
      async (err, rows) => {
        if (err || rows.length > 0) return resolve(); // already sent

        // Insert log first to prevent duplicates
        db.query(
          "INSERT IGNORE INTO reminder_logs (booking_id, minutes_before) VALUES (?, ?)",
          [booking.id, hoursBefore],
          async (insertErr) => {
            if (insertErr) return resolve(); // unique constraint hit

            const pickupFormatted = new Date(
              booking.pickup_datetime,
            ).toLocaleString("en-NP", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            try {
              await createNotification({
                user_id: booking.user_id,
                booking_id: booking.id,
                title: `Pickup Reminder — ${label} to go 🚗`,
                message: `Your vehicle pickup for booking ${booking.booking_ref} is in ${label}! 📍 ${booking.pickup_location} at ${pickupFormatted}. Please be ready.`,
                type: "reminder",
                target_role: "user",
                meta: {
                  booking_ref: booking.booking_ref,
                  pickup_datetime: booking.pickup_datetime,
                  pickup_location: booking.pickup_location,
                  hours_before: hoursBefore,
                },
              });
            } catch (e) {
              console.error("[Reminder] createNotification failed:", e);
            }

            resolve();
          },
        );
      },
    );
  });
}

module.exports = {}; // cron starts automatically on require()
