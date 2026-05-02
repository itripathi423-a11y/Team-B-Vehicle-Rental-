// admin.kyc.controller.js
const transporter = require("../utils/mailer");
const db = require("../config/db");

// ── email helpers (same brand kit) ───────────────────────────────────────
const emailHeader = (tagLabel) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <tr>
      <td>
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#ff5c1a;border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;">
              <span style="color:#fff;font-size:12px;font-weight:700;font-family:monospace;">AD</span>
            </td>
            <td style="padding-left:12px;">
              <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:2px;font-family:monospace;">AUTO DEALER</div>
              <div style="color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:1.5px;font-family:monospace;">FLEET MANAGEMENT</div>
            </td>
          </tr>
        </table>
      </td>
      <td align="right">
        <span style="background:#ff5c1a;color:#fff;font-size:11px;font-weight:600;padding:5px 12px;border-radius:99px;">${tagLabel}</span>
      </td>
    </tr>
  </table>`;

const emailFooter = () => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;border-radius:0 0 12px 12px;">
    <tr><td style="text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Auto Dealer · Fleet Management System</p>
    </td></tr>
  </table>`;

const emailWrapper = (innerHtml) =>
  `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        ${innerHtml}
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

// KYC status configs
const KYC_STYLE = {
  verified: {
    bg: "#ecfdf5",
    border: "#a7f3d0",
    text: "#065f46",
    icon: "✅",
    title: "KYC Verified",
    body: "Your identity has been successfully verified. You can now book vehicles on Auto Dealer.",
  },
  rejected: {
    bg: "#fff1f2",
    border: "#fecdd3",
    text: "#991b1b",
    icon: "❌",
    title: "KYC Rejected",
    body: "Unfortunately, your KYC verification was not successful. Please re-submit with clearer documents.",
  },
  pending: {
    bg: "#fffbeb",
    border: "#fde68a",
    text: "#92400e",
    icon: "⏳",
    title: "KYC Under Review",
    body: "Your documents have been received and are currently under review. We will notify you once the process is complete.",
  },
  not_submitted: {
    bg: "#f3f4f6",
    border: "#e5e7eb",
    text: "#374151",
    icon: "📋",
    title: "KYC Not Submitted",
    body: "Your KYC status has been updated.",
  },
};

// ───────── GET ALL KYC ─────────
exports.getAllKyc = (req, res) => {
  const sql = `
    SELECT k.id, k.document_type, k.document_number,
           k.document_front, k.document_back, k.selfie,
           k.status, k.rejection_reason, k.submitted_at,
           u.name AS user_name, u.email AS user_email, u.phone
    FROM kyc k
    LEFT JOIN users u ON k.user_id = u.id
    ORDER BY k.submitted_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("getAllKyc error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }

    const BASE = "http://localhost:5000";

    const formatted = results.map((k) => {
      let submitted = "";
      if (k.submitted_at) {
        const d =
          k.submitted_at instanceof Date
            ? k.submitted_at
            : new Date(k.submitted_at);
        submitted = d.toISOString().split("T")[0];
      }
      const DOC_TYPE_MAP = {
        Citizenship: "Citizenship",
        Passport: "Passport",
        License: "Driving License",
      };
      const toUrl = (p) => (p ? `${BASE}${p}` : "");

      return {
        id: k.id,
        user_name: k.user_name || "Unknown",
        user_email: k.user_email || "",
        phone: k.phone || "",
        photo: toUrl(k.selfie),
        status: k.status || "not_submitted",
        doc_type: DOC_TYPE_MAP[k.document_type] || k.document_type,
        doc_number: k.document_number || "",
        front_img: toUrl(k.document_front),
        back_img: toUrl(k.document_back),
        submitted,
        reason: k.rejection_reason || "",
        address: "—",
      };
    });

    res.json({ success: true, data: formatted });
  });
};

// ───────── UPDATE KYC STATUS ─────────
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

  // 1. Get user info + doc type
  const getSql = `
    SELECT u.name, u.email, k.document_type
    FROM kyc k
    LEFT JOIN users u ON k.user_id = u.id
    WHERE k.id = ?
  `;

  db.query(getSql, [id], (err, rows) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: `KYC #${id} not found` });

    const user = rows[0];

    // 2. Update status
    const updateSql = `UPDATE kyc SET status = ?, rejection_reason = ?, reviewed_at = NOW() WHERE id = ?`;

    db.query(
      updateSql,
      [dbStatus, rejection_reason || null, id],
      async (err2) => {
        if (err2)
          return res
            .status(500)
            .json({ success: false, message: err2.message });

        // 3. Send branded email
        try {
          if (user.email) {
            const cfg = KYC_STYLE[dbStatus] || KYC_STYLE.pending;

            await transporter.sendMail({
              from: `"Auto Dealer" <${process.env.EMAIL_USER}>`,
              to: user.email,
              subject: `KYC ${dbStatus.charAt(0).toUpperCase() + dbStatus.slice(1)} — Auto Dealer`,
              html: emailWrapper(`
              ${emailHeader(cfg.title)}
              <tr><td style="padding:32px;">
                <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#111827;">Hi ${user.name || "User"},</p>
                <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                  Your KYC verification status has been updated.
                </p>

                <!-- status banner -->
                <div style="background:${cfg.bg};border:1px solid ${cfg.border};border-radius:8px;padding:18px 20px;margin-bottom:20px;">
                  <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${cfg.text};">${cfg.icon} ${cfg.title}</p>
                  <p style="margin:0;font-size:13px;color:${cfg.text};opacity:0.9;line-height:1.6;">${cfg.body}</p>
                </div>

                <!-- doc info box -->
                <div style="background:#f4f5f7;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;font-size:12px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;
                                 color:#9ca3af;font-family:monospace;width:40%;border-bottom:1px solid #e5e7eb;">Document Type</td>
                      <td style="padding:8px 0;font-size:14px;color:#111827;border-bottom:1px solid #e5e7eb;">${user.document_type || "—"}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;font-size:12px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;
                                 color:#9ca3af;font-family:monospace;">Status</td>
                      <td style="padding:8px 0;font-size:14px;color:${cfg.text};font-weight:600;">${cfg.title}</td>
                    </tr>
                  </table>
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
                    <p style="margin:0;font-size:13px;color:#1d4ed8;line-height:1.6;">
                      🚗 You can now browse and book vehicles on Auto Dealer. Enjoy your ride!
                    </p>
                  </div>`
                    : ""
                }

                <p style="margin:0;font-size:13px;color:#9ca3af;">
                  Need help? Contact us through our website or reply to this email.
                </p>
              </td></tr>
              ${emailFooter()}
            `),
            });
            console.log("✅ KYC email sent to", user.email);
          }
        } catch (mailErr) {
          console.error("❌ KYC email error:", mailErr);
        }

        return res.json({
          success: true,
          message: "KYC status updated and email sent",
        });
      },
    );
  });
};
