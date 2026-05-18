const cron = require("node-cron");
const db = require("../config/db");
const {
  createNotification,
} = require("../controllers/notification.controller");

let isRunning = false;

// ── Run every minute ─────────────────────────────────────────────────────
cron.schedule("* * * * *", () => {
  if (isRunning) {
    console.warn("[Status Cron] Previous run still in progress, skipping.");
    return;
  }
  isRunning = true;

  activateConfirmedBookings()
    .then(() => completeActiveBookings())
    .catch((e) => console.error("[Status Cron] Error:", e))
    .finally(() => {
      isRunning = false;
    });
});

/* ── CONFIRMED → ACTIVE ──────────────────────────────────────────────────
   Find all Confirmed bookings whose pickup_datetime has passed
──────────────────────────────────────────────────────────────────────── */
function activateConfirmedBookings() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        b.id,
        b.booking_ref,
        b.user_id,
        b.vehicle_id,
        b.user_name,
        b.user_email,
        v.name AS vehicle_name
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE
        b.status = 'Confirmed'
        AND b.pickup_datetime <= NOW()
    `;

    db.query(sql, (err, bookings) => {
      if (err) {
        console.error("[Status Cron] activateConfirmed DB error:", err);
        return reject(err);
      }

      if (!bookings.length) return resolve();

      const tasks = bookings.map((b) => activateBooking(b));
      Promise.all(tasks).then(resolve).catch(reject);
    });
  });
}

/* ── ACTIVE → COMPLETED ──────────────────────────────────────────────────
   Find all Active bookings whose drop_datetime has passed
──────────────────────────────────────────────────────────────────────── */
function completeActiveBookings() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        b.id,
        b.booking_ref,
        b.user_id,
        b.vehicle_id,
        b.user_name,
        b.user_email,
        v.name AS vehicle_name
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE
        b.status = 'Active'
        AND b.drop_datetime <= NOW()
    `;

    db.query(sql, (err, bookings) => {
      if (err) {
        console.error("[Status Cron] completeActive DB error:", err);
        return reject(err);
      }

      if (!bookings.length) return resolve();

      const tasks = bookings.map((b) => completeBooking(b));
      Promise.all(tasks).then(resolve).catch(reject);
    });
  });
}

/* ── ACTIVATE a single booking ───────────────────────────────────────── */
function activateBooking(b) {
  return new Promise((resolve) => {
    db.query(
      "UPDATE bookings SET status = 'Active' WHERE id = ? AND status = 'Confirmed'",
      [b.id],
      async (err, result) => {
        if (err || result.affectedRows === 0) return resolve(); // already changed

        console.log(
          `[Status Cron] Booking #${b.id} (${b.booking_ref}) → Active`,
        );

        // Make vehicle Booked
        db.query("UPDATE vehicles SET status = 'Booked' WHERE id = ?", [
          b.vehicle_id,
        ]);

        // Admin notification
        db.query(
          `INSERT INTO admin_notifications (title, message, type, ref_id, ref_type, meta)
           VALUES (?, ?, 'booking', ?, 'booking', ?)`,
          [
            "Booking Active 🚗",
            `Booking ${b.booking_ref} for ${b.user_name} automatically marked as Active.`,
            b.id,
            JSON.stringify({
              booking_ref: b.booking_ref,
              user_name: b.user_name,
              vehicle_name: b.vehicle_name,
              status: "Active",
              auto: true,
            }),
          ],
        );

        // User notification
        try {
          await createNotification({
            user_id: b.user_id,
            booking_id: b.id,
            title: "Booking Active 🚗",
            message: `Your booking ${b.booking_ref} for ${b.vehicle_name} is now Active. Enjoy your ride!`,
            type: "booking",
            target_role: "user",
            meta: {
              booking_ref: b.booking_ref,
              vehicle_name: b.vehicle_name,
              status: "Active",
            },
          });
        } catch (e) {
          console.error("[Status Cron] Notify Active failed:", e);
        }

        resolve();
      },
    );
  });
}

/* ── COMPLETE a single booking ───────────────────────────────────────── */
function completeBooking(b) {
  return new Promise((resolve) => {
    db.query(
      "UPDATE bookings SET status = 'Completed' WHERE id = ? AND status = 'Active'",
      [b.id],
      async (err, result) => {
        if (err || result.affectedRows === 0) return resolve(); // already changed

        console.log(
          `[Status Cron] Booking #${b.id} (${b.booking_ref}) → Completed`,
        );

        // Free the vehicle
        db.query("UPDATE vehicles SET status = 'Available' WHERE id = ?", [
          b.vehicle_id,
        ]);

        // Admin notification
        db.query(
          `INSERT INTO admin_notifications (title, message, type, ref_id, ref_type, meta)
           VALUES (?, ?, 'booking', ?, 'booking', ?)`,
          [
            "Booking Completed 🏁",
            `Booking ${b.booking_ref} for ${b.user_name} automatically marked as Completed.`,
            b.id,
            JSON.stringify({
              booking_ref: b.booking_ref,
              user_name: b.user_name,
              vehicle_name: b.vehicle_name,
              status: "Completed",
              auto: true,
            }),
          ],
        );

        // User notification
        try {
          await createNotification({
            user_id: b.user_id,
            booking_id: b.id,
            title: "Booking Completed 🏁",
            message: `Your booking ${b.booking_ref} for ${b.vehicle_name} has been marked as Completed. Thank you for choosing us!`,
            type: "booking",
            target_role: "user",
            meta: {
              booking_ref: b.booking_ref,
              vehicle_name: b.vehicle_name,
              status: "Completed",
            },
          });
        } catch (e) {
          console.error("[Status Cron] Notify Completed failed:", e);
        }

        resolve();
      },
    );
  });
}

module.exports = {}; // cron starts automatically on require()
