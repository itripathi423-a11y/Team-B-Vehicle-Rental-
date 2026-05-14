// controllers/admin.kyc.controller.js

const db = require("../config/db");
const transporter = require("../utils/mailer");
const { createNotification } = require("./notification.controller");
const { createAdminNotification } = require("./admin.notification.controller");

// ── email helpers ────────────────────────────────────────────────────────
const emailWrapper = (inner) =>
  `
<!DOCTYPE html><html>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        ${inner}
      </table>
    </td></tr>
  </table>
</body></html>`.trim();

const emailHeader = (tag) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <tr>
      <td>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#ff5c1a;border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;">
            <span style="color:#fff;font-size:12px;font-weight:700;font-family:monospace;">AD</span>
          </td>
          <td style="padding-left:12px;">
            <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:2px;font-family:monospace;">AUTO DEALER</div>
            <div style="color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:1.5px;font-family:monospace;">FLEET MANAGEMENT</div>
          </td>
        </tr></table>
      </td>
      <td align="right">
        <span style="background:#ff5c1a;color:#fff;font-size:11px;font-weight:600;padding:5px 12px;border-radius:99px;">${tag}</span>
      </td>
    </tr>
  </table>`;

const emailFooter = () => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;border-radius:0 0 12px 12px;">
    <tr><td style="text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Auto Dealer · Fleet Management System</p>
    </td></tr>
  </table>`;

// KYC status metadata
const KYC_META = {
  verified: {
    bg: "#ecfdf5",
    border: "#a7f3d0",
    text: "#065f46",
    icon: "✅",
    title: "KYC Verified",
    body: "Your identity has been successfully verified. You can now book vehicles on Auto Dealer.",
    notifMsg: "Your KYC has been verified. You can now make bookings.",
  },
  rejected: {
    bg: "#fff1f2",
    border: "#fecdd3",
    text: "#991b1b",
    icon: "❌",
    title: "KYC Rejected",
    body: "Unfortunately your KYC verification was not successful. Please re-submit with clearer documents.",
    notifMsg: "Your KYC was rejected. Please re-submit with clearer documents.",
  },
  pending: {
    bg: "#fffbeb",
    border: "#fde68a",
    text: "#92400e",
    icon: "⏳",
    title: "KYC Under Review",
    body: "Your documents are currently under review. We will notify you once complete.",
    notifMsg: "Your KYC documents are under review.",
  },
  not_submitted: {
    bg: "#f3f4f6",
    border: "#e5e7eb",
    text: "#374151",
    icon: "📋",
    title: "KYC Status Updated",
    body: "Your KYC status has been updated.",
    notifMsg: "Your KYC status has been updated.",
  },
};

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/admin/kyc
   Returns all KYC submissions including personal, address,
   and family details stored in the kyc table.
   NOTE: issue_date and expiry_date have been removed from the schema.
════════════════════════════════════════════════════════════════════════ */
exports.getAllKyc = (req, res) => {
  const sql = `
    SELECT
      k.id,
      k.user_id,
      k.document_type,
      k.document_number,
      k.document_front,
      k.document_back,
      k.selfie,
      k.status,
      k.rejection_reason,
      k.submitted_at,
      k.reviewed_at,

      -- Personal Details (now required)
      k.date_of_birth,
      k.gender,
      k.nationality,
      k.occupation,

      -- Address Details
      k.permanent_address,
      k.temporary_address,

      -- Family Details
      k.father_name,
      k.mother_name,
      k.grandfather_name,
      k.marital_status,
      k.spouse_name,

      -- User account info
      u.name  AS user_name,
      u.email AS user_email,
      u.phone

    FROM kyc k
    LEFT JOIN users u ON k.user_id = u.id
    ORDER BY k.submitted_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });

    const BASE = "http://localhost:5000";

    const DOC_TYPE_MAP = {
      Citizenship: "Citizenship",
      Passport: "Passport",
      License: "Driving License",
    };

    const toUrl = (p) => (p ? `${BASE}${p}` : "");
    const fmtDate = (d) => {
      if (!d) return "";
      const dt = d instanceof Date ? d : new Date(d);
      return isNaN(dt.getTime()) ? "" : dt.toISOString().split("T")[0];
    };

    const formatted = results.map((k) => ({
      id: k.id,
      user_id: k.user_id,

      // User account
      user_name: k.user_name || "Unknown",
      user_email: k.user_email || "",
      phone: k.phone || "",

      // Photo / selfie
      photo: toUrl(k.selfie),

      // Status
      status: k.status || "not_submitted",
      reason: k.rejection_reason || "",

      // Document
      doc_type: DOC_TYPE_MAP[k.document_type] || k.document_type || "—",
      doc_number: k.document_number || "",
      front_img: toUrl(k.document_front),
      back_img: toUrl(k.document_back),

      // Timestamps
      submitted: fmtDate(k.submitted_at),
      reviewed: fmtDate(k.reviewed_at),

      // Personal details (required from frontend)
      date_of_birth: fmtDate(k.date_of_birth),
      gender: k.gender || "",
      nationality: k.nationality || "",
      occupation: k.occupation || "",

      // Address details
      permanent_address: k.permanent_address || "",
      temporary_address: k.temporary_address || "",

      // Family details
      father_name: k.father_name || "",
      mother_name: k.mother_name || "",
      grandfather_name: k.grandfather_name || "",
      marital_status: k.marital_status || "",
      spouse_name: k.spouse_name || "",
    }));

    res.json({ success: true, data: formatted });
  });
};

/* ═══════════════════════════════════════════════════════════════════════
   PUT /api/admin/kyc/:id
   ✅ Notifies the USER via `notifications` table + socket
   ✅ Logs for other ADMINs via `admin_notifications` table + socket
   ✅ Sends email to user
════════════════════════════════════════════════════════════════════════ */
exports.updateKycStatus = (req, res) => {
  const { id } = req.params;
  const { status, rejection_reason } = req.body;

  const STATUS_MAP = {
    not_submitted: "not_submitted",
    pending: "pending",
    verified: "verified",
    rejected: "rejected",
  };
  const dbStatus = STATUS_MAP[status];
  if (!dbStatus)
    return res
      .status(400)
      .json({ success: false, message: `Invalid status: ${status}` });

  // 1. Fetch user info
  db.query(
    `SELECT u.id AS user_id, u.name, u.email, k.document_type
     FROM kyc k LEFT JOIN users u ON k.user_id = u.id
     WHERE k.id = ?`,
    [id],
    (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      if (!rows.length)
        return res
          .status(404)
          .json({ success: false, message: `KYC #${id} not found` });

      const user = rows[0];
      const cfg = KYC_META[dbStatus] || KYC_META.pending;

      // 2. Update DB
      db.query(
        "UPDATE kyc SET status = ?, rejection_reason = ?, reviewed_at = NOW() WHERE id = ?",
        [dbStatus, rejection_reason || null, id],
        async (err2) => {
          if (err2)
            return res
              .status(500)
              .json({ success: false, message: err2.message });

          // ── 3. Notify USER ────────────────────────────────────
          try {
            await createNotification({
              user_id: user.user_id,
              booking_id: null,
              title: `${cfg.icon} ${cfg.title}`,
              message:
                dbStatus === "rejected" && rejection_reason
                  ? `${cfg.notifMsg} Reason: ${rejection_reason}`
                  : cfg.notifMsg,
              type: "kyc",
              target_role: "user",
            });
          } catch (e) {
            console.warn(
              "[updateKycStatus] User notification error:",
              e.message,
            );
          }

          // ── 4. Log for ADMIN ──────────────────────────────────
          try {
            await createAdminNotification({
              title: `KYC ${dbStatus.charAt(0).toUpperCase() + dbStatus.slice(1)} ${cfg.icon}`,
              message: `KYC for ${user.name} (${user.email}) marked as ${dbStatus}.`,
              type: "kyc",
              ref_id: Number(id),
              ref_type: "kyc",
              meta: {
                user_name: user.name,
                user_email: user.email,
                kyc_status: dbStatus,
                rejection_reason: rejection_reason || null,
              },
            });
          } catch (e) {
            console.warn(
              "[updateKycStatus] Admin notification error:",
              e.message,
            );
          }

          // ── 5. Email USER ─────────────────────────────────────
          try {
            if (user.email) {
              await transporter.sendMail({
                from: `"Auto Dealer" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: `${cfg.title} — Auto Dealer`,
                html: emailWrapper(`
                  ${emailHeader(cfg.title)}
                  <tr><td style="padding:32px;">
                    <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#111827;">Hi ${user.name || "User"},</p>
                    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Your KYC verification status has been updated.</p>
                    <div style="background:${cfg.bg};border:1px solid ${cfg.border};border-radius:8px;padding:18px 20px;margin-bottom:20px;">
                      <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${cfg.text};">${cfg.icon} ${cfg.title}</p>
                      <p style="margin:0;font-size:13px;color:${cfg.text};opacity:0.9;line-height:1.6;">${cfg.body}</p>
                    </div>
                    ${
                      dbStatus === "rejected" && rejection_reason
                        ? `
                    <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
                      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#991b1b;font-family:monospace;">Rejection Reason</p>
                      <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.6;">${rejection_reason}</p>
                    </div>`
                        : ""
                    }
                    ${
                      dbStatus === "verified"
                        ? `
                    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
                      <p style="margin:0;font-size:13px;color:#1d4ed8;line-height:1.6;">🚗 You can now browse and book vehicles on Auto Dealer!</p>
                    </div>`
                        : ""
                    }
                    <p style="margin:0;font-size:13px;color:#9ca3af;">Need help? Contact us through our website.</p>
                  </td></tr>
                  ${emailFooter()}
                `),
              });
            }
          } catch (e) {
            console.error("KYC email error:", e);
          }

          return res.json({
            success: true,
            message: "KYC status updated and notifications sent",
          });
        },
      );
    },
  );
};
