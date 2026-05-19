const db = require("../config/db");
const { createAdminNotification } = require("./admin.notification.controller");

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given a last_service_date, return the frontend status string.
 *
 * Rules:
 *   • No date recorded       → "scheduled"   (never serviced)
 *   • 0–25 days ago          → "completed"   (recently serviced, all good)
 *   • 25–30 days ago         → "in_progress" (due soon — use as a "warning" state)
 *   • > 30 days ago          → "overdue"     (needs service NOW)
 *   • If DB already says "Needs Service" → "overdue" (honour explicit flag)
 */
function deriveStatus(lastServiceDate, dbServiceStatus) {
  // Explicit DB flag always wins for "Needs Service"
  if (dbServiceStatus === "Needs Service") return "overdue";

  if (!lastServiceDate) return "scheduled";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const svcDate = new Date(lastServiceDate);
  svcDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today - svcDate) / (1000 * 60 * 60 * 24));

  if (diffDays > 30) return "overdue";
  if (diffDays >= 25) return "in_progress"; // "due soon" — shown as amber in UI
  return "completed";
}

/** Map frontend status → DB service_status enum */
function mapToDbStatus(frontendStatus) {
  const map = {
    completed: "Serviced",
    overdue: "Needs Service",
    scheduled: "Needs Service",
    in_progress: "Needs Service",
    cancelled: "Serviced",
  };
  return map[(frontendStatus || "").toLowerCase()] || "Serviced";
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/servicing
// Returns all vehicles with their computed service status.
// ─────────────────────────────────────────────────────────────────────────────
exports.getServiceList = (req, res) => {
  const sql = `
    SELECT 
      id,
      name,
      brand,
      model,
      license_plate,
      body_type,
      thumbnail,
      last_service_date,
      service_status
    FROM vehicles
    WHERE is_deleted = 0
    ORDER BY
      -- Sort overdue / due-soon vehicles first
      CASE
        WHEN service_status = 'Needs Service' THEN 0
        WHEN last_service_date IS NULL THEN 1
        WHEN DATEDIFF(CURDATE(), last_service_date) > 30 THEN 0
        WHEN DATEDIFF(CURDATE(), last_service_date) >= 25 THEN 1
        ELSE 2
      END,
      last_service_date ASC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });

    const mapped = result.map((v) => {
      const computedStatus = deriveStatus(
        v.last_service_date,
        v.service_status,
      );

      // Calculate next service date (30 days after last service)
      let nextServiceDate = null;
      let daysUntilService = null;
      let daysSinceService = null;

      if (v.last_service_date) {
        const svcDate = new Date(v.last_service_date);
        const nextDate = new Date(svcDate);
        nextDate.setDate(nextDate.getDate() + 30);
        nextServiceDate = nextDate.toISOString().split("T")[0];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        daysSinceService = Math.floor(
          (today - svcDate) / (1000 * 60 * 60 * 24),
        );
        daysUntilService = 30 - daysSinceService;
      }

      return {
        id: v.id,
        vehicle_name: v.name,
        vehicle_brand: v.brand,
        vehicle_model: v.model,
        vehicle_plate: v.license_plate || "—",
        vehicle_type: v.body_type || "—",
        thumbnail: v.thumbnail || null,
        servicing_date: v.last_service_date, // last service date
        next_service_date: nextServiceDate, // computed next date
        days_since_service: daysSinceService,
        days_until_service: daysUntilService,
        status: computedStatus,
        db_service_status: v.service_status,
      };
    });

    res.json({ data: mapped });
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/servicing/:id
// Update service status + date. Sends a notification when marked complete.
// ─────────────────────────────────────────────────────────────────────────────
exports.updateServiceStatus = (req, res) => {
  const { id } = req.params;
  const { status, servicing_date } = req.body;

  const dbStatus = mapToDbStatus(status);
  const dateValue = servicing_date || null;

  // First fetch vehicle name for the notification message
  db.query(
    "SELECT name, license_plate FROM vehicles WHERE id = ?",
    [id],
    (fetchErr, rows) => {
      if (fetchErr)
        return res.status(500).json({ message: "DB error", error: fetchErr });
      const vehicle = rows[0] || { name: `Vehicle #${id}`, license_plate: "—" };

      const sql = `
        UPDATE vehicles
        SET service_status = ?, last_service_date = ?
        WHERE id = ?
      `;

      db.query(sql, [dbStatus, dateValue, id], (err, result) => {
        if (err)
          return res.status(500).json({ message: "DB error", error: err });
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Vehicle not found" });
        }

        // ── Notify admins when a service is marked completed ──────────────
        if (status === "completed") {
          const nextDate = dateValue
            ? (() => {
                const d = new Date(dateValue);
                d.setDate(d.getDate() + 30);
                return d.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });
              })()
            : "30 days from today";

          createAdminNotification({
            title: `🔧 Service Completed — ${vehicle.name}`,
            message: `${vehicle.name} (${vehicle.license_plate}) has been serviced. Next service due: ${nextDate}.`,
            type: "general",
            ref_id: parseInt(id),
            ref_type: "vehicle",
            meta: {
              vehicle_id: parseInt(id),
              vehicle_name: vehicle.name,
              vehicle_plate: vehicle.license_plate,
              serviced_on: dateValue,
              next_service_due: nextDate,
            },
          }).catch((e) =>
            console.warn("[Servicing] Notification failed:", e.message),
          );
        }

        res.json({
          message: "Service status updated",
          id,
          status,
          servicing_date: dateValue,
        });
      });
    },
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/servicing/:id/mark-serviced
// Quick action — sets today as service date + marks as Serviced.
// ─────────────────────────────────────────────────────────────────────────────
exports.markServiced = (req, res) => {
  const { id } = req.params;
  const today = new Date().toISOString().slice(0, 10);

  db.query(
    "SELECT name, license_plate FROM vehicles WHERE id = ?",
    [id],
    (fetchErr, rows) => {
      if (fetchErr)
        return res.status(500).json({ message: "DB error", error: fetchErr });
      const vehicle = rows[0] || { name: `Vehicle #${id}`, license_plate: "—" };

      const sql = `
        UPDATE vehicles
        SET service_status = 'Serviced',
            last_service_date = ?
        WHERE id = ?
      `;

      db.query(sql, [today, id], (err, result) => {
        if (err)
          return res.status(500).json({ message: "DB error", error: err });
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Vehicle not found" });
        }

        // Calculate next service date
        const nextDate = new Date(today);
        nextDate.setDate(nextDate.getDate() + 30);
        const nextDateStr = nextDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        // Notify admins
        createAdminNotification({
          title: `🔧 Service Completed — ${vehicle.name}`,
          message: `${vehicle.name} (${vehicle.license_plate}) marked as serviced today. Next service due: ${nextDateStr}.`,
          type: "general",
          ref_id: parseInt(id),
          ref_type: "vehicle",
          meta: {
            vehicle_id: parseInt(id),
            vehicle_name: vehicle.name,
            vehicle_plate: vehicle.license_plate,
            serviced_on: today,
            next_service_due: nextDateStr,
          },
        }).catch((e) =>
          console.warn("[Servicing] Notification failed:", e.message),
        );

        res.json({
          message: "Vehicle marked as serviced",
          id,
          servicing_date: today,
          next_service_due: nextDateStr,
        });
      });
    },
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CRON JOB FUNCTION — call this daily (e.g. every morning at 8 AM)
//
// Checks all vehicles:
//   • Exactly 25 days since last service → "Due Soon" warning notification
//   • Exactly 30 days since last service → "Overdue" notification + updates DB flag
//
// Usage in your cron file:
//   const { checkAndNotifyServiceDue } = require('./admin.servicing.controller');
//   cron.schedule('0 8 * * *', () => checkAndNotifyServiceDue());
// ─────────────────────────────────────────────────────────────────────────────
exports.checkAndNotifyServiceDue = () => {
  const sql = `
    SELECT id, name, license_plate, last_service_date, service_status
    FROM vehicles
    WHERE is_deleted = 0
      AND last_service_date IS NOT NULL
  `;

  db.query(sql, (err, vehicles) => {
    if (err) {
      console.error("[ServiceCron] DB error:", err);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    vehicles.forEach((v) => {
      const svcDate = new Date(v.last_service_date);
      svcDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - svcDate) / (1000 * 60 * 60 * 24));

      // ── 25 days: "Due Soon" warning ──────────────────────────────────────
      if (diffDays === 25) {
        createAdminNotification({
          title: `⚠️ Service Due Soon — ${v.name}`,
          message: `${v.name} (${v.license_plate}) is due for service in 5 days. Last serviced: ${new Date(v.last_service_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}.`,
          type: "general",
          ref_id: v.id,
          ref_type: "vehicle",
          meta: {
            vehicle_id: v.id,
            vehicle_name: v.name,
            vehicle_plate: v.license_plate,
            last_service_date: v.last_service_date,
            days_overdue: 0,
            days_remaining: 5,
          },
        }).catch((e) =>
          console.warn(
            `[ServiceCron] Notif failed for vehicle ${v.id}:`,
            e.message,
          ),
        );
      }

      // ── 30 days: Mark overdue + send urgent notification ─────────────────
      if (diffDays >= 30 && v.service_status !== "Needs Service") {
        // Update DB flag
        db.query(
          "UPDATE vehicles SET service_status = 'Needs Service' WHERE id = ?",
          [v.id],
          (updateErr) => {
            if (updateErr) {
              console.error(
                `[ServiceCron] Failed to update vehicle ${v.id}:`,
                updateErr,
              );
              return;
            }

            const daysOverdue = diffDays - 30;
            const overdueText =
              daysOverdue > 0
                ? ` (${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue)`
                : "";

            createAdminNotification({
              title: `🚨 Service Overdue — ${v.name}`,
              message: `${v.name} (${v.license_plate}) has not been serviced in ${diffDays} days${overdueText}. Immediate attention required.`,
              type: "general",
              ref_id: v.id,
              ref_type: "vehicle",
              meta: {
                vehicle_id: v.id,
                vehicle_name: v.name,
                vehicle_plate: v.license_plate,
                last_service_date: v.last_service_date,
                days_since_service: diffDays,
                days_overdue: daysOverdue,
              },
            }).catch((e) =>
              console.warn(
                `[ServiceCron] Notif failed for vehicle ${v.id}:`,
                e.message,
              ),
            );
          },
        );
      }

      // ── Already overdue (DB flag set) but keep re-notifying weekly ───────
      // Sends a reminder every 7 days after the initial overdue notification
      if (diffDays > 30 && v.service_status === "Needs Service") {
        const daysOverdue = diffDays - 30;
        if (daysOverdue > 0 && daysOverdue % 7 === 0) {
          createAdminNotification({
            title: `🚨 Service Still Overdue — ${v.name} (${daysOverdue}d)`,
            message: `REMINDER: ${v.name} (${v.license_plate}) service is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue. Last serviced: ${new Date(v.last_service_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}.`,
            type: "general",
            ref_id: v.id,
            ref_type: "vehicle",
            meta: {
              vehicle_id: v.id,
              vehicle_name: v.name,
              vehicle_plate: v.license_plate,
              last_service_date: v.last_service_date,
              days_overdue: daysOverdue,
            },
          }).catch((e) =>
            console.warn(
              `[ServiceCron] Weekly reminder failed for vehicle ${v.id}:`,
              e.message,
            ),
          );
        }
      }
    });

    console.log(
      `[ServiceCron] Checked ${vehicles.length} vehicles at ${new Date().toISOString()}`,
    );
  });
};
