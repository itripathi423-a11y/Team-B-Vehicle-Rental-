// controllers/kyc.controller.js
// USER-SIDE KYC controller.
// On submit/resubmit → notifies USER + notifies ADMIN (DB + socket) + emails admin.
// On status change   → notifyKycStatusChange() called from admin.kyc.controller.js.

const db = require("../config/db");
const transporter = require("../utils/mailer");
const { createNotification } = require("./notification.controller");
const { createAdminNotification } = require("./admin.notification.controller");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

/* ── Email helpers ────────────────────────────────────────────────────── */
const emailHeader = (tagLabel) => `
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#0a0a0a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <tr>
      <td>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#ff5c1a;border-radius:8px;width:36px;height:36px;
                     text-align:center;vertical-align:middle;">
            <span style="color:#fff;font-size:12px;font-weight:700;font-family:monospace;">AD</span>
          </td>
          <td style="padding-left:12px;">
            <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:2px;font-family:monospace;">AUTO DEALER</div>
            <div style="color:rgba(255,255,255,.4);font-size:9px;letter-spacing:1.5px;font-family:monospace;">FLEET MANAGEMENT</div>
          </td>
        </tr></table>
      </td>
      <td align="right">
        <span style="background:#ff5c1a;color:#fff;font-size:11px;font-weight:600;
                     padding:5px 12px;border-radius:99px;">${tagLabel}</span>
      </td>
    </tr>
  </table>`;

const emailFooter = () => `
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;
           border-radius:0 0 12px 12px;">
    <tr><td style="text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        © ${new Date().getFullYear()} Auto Dealer · Fleet Management System
      </p>
    </td></tr>
  </table>`;

const emailWrapper = (inner) =>
  `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f5f7;
    font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f4f5f7;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:12px;overflow:hidden;
               box-shadow:0 4px 20px rgba(0,0,0,.08);">
        ${inner}
      </table>
    </td></tr>
  </table></body></html>`.trim();

const row = (label, value) => `
  <tr>
    <td style="padding:10px 0;font-size:12px;font-weight:700;letter-spacing:.8px;
               text-transform:uppercase;color:#9ca3af;font-family:monospace;
               width:40%;border-bottom:1px solid #f3f4f6;">${label}</td>
    <td style="padding:10px 0;font-size:14px;color:#111827;
               border-bottom:1px solid #f3f4f6;">${value}</td>
  </tr>`;

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/kyc/user-info
════════════════════════════════════════════════════════════════════════ */
exports.getUserInfo = (req, res) => {
  const userId = req.session?.user?.id;
  if (!userId)
    return res.status(401).json({ success: false, message: "Not logged in" });

  db.query(
    "SELECT id, name, email, phone FROM users WHERE id = ?",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ success: false });
      if (!result.length)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      res.json({ success: true, data: result[0] });
    },
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/kyc/status
════════════════════════════════════════════════════════════════════════ */
exports.getKycStatus = (req, res) => {
  const userId = req.session?.user?.id;
  if (!userId)
    return res.status(401).json({ success: false, message: "Not logged in" });

  db.query(
    "SELECT * FROM kyc WHERE user_id = ? LIMIT 1",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true, data: result[0] || null });
    },
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   POST /api/kyc/submit
   ✅ Notifies USER via `notifications` table + socket
   ✅ Notifies ADMIN via `admin_notifications` table + socket
   ✅ Emails admin
════════════════════════════════════════════════════════════════════════ */
exports.submitKyc = (req, res) => {
  const userId = req.session?.user?.id;
  if (!userId)
    return res.status(401).json({ success: false, message: "Not logged in" });

  const { document_type, document_number } = req.body;

  if (!document_type || !document_number)
    return res.status(400).json({
      success: false,
      message: "document_type and document_number required",
    });

  const front = req.files?.document_front?.[0];
  const back = req.files?.document_back?.[0];
  const selfie = req.files?.selfie?.[0];

  if (!front || !back || !selfie)
    return res
      .status(400)
      .json({ success: false, message: "All three documents are required" });

  const frontPath = `/uploads/kyc/${front.filename}`;
  const backPath = `/uploads/kyc/${back.filename}`;
  const selfiePath = `/uploads/kyc/${selfie.filename}`;

  // Fetch user info
  db.query(
    "SELECT name, email, phone FROM users WHERE id = ?",
    [userId],
    (err, userRows) => {
      if (err) return res.status(500).json({ success: false });

      const user = userRows[0] || {};

      // Check for existing KYC
      db.query(
        "SELECT id FROM kyc WHERE user_id = ?",
        [userId],
        async (err2, existing) => {
          if (err2) return res.status(500).json({ success: false });

          const isResubmit = existing.length > 0;

          /* ── Email admin ──────────────────────────────────────────── */
          const sendAdminEmail = async (kycRef) => {
            const tagLabel = isResubmit
              ? "KYC Re-submitted"
              : "New KYC Submission";
            const headingTx = isResubmit
              ? "KYC Re-submitted for Review"
              : "New KYC Submission Received";
            const bodyTx = isResubmit
              ? `<b>${user.name}</b> has re-submitted their KYC after a previous rejection.`
              : `A new KYC submission has been received from <b>${user.name}</b>.`;

            try {
              await transporter.sendMail({
                from: `"Auto Dealer System" <${process.env.EMAIL_USER}>`,
                to: ADMIN_EMAIL,
                subject: `${tagLabel} — ${kycRef}`,
                html: emailWrapper(`
                  ${emailHeader(tagLabel)}
                  <tr><td style="padding:32px;">
                    <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#111827;">${headingTx}</p>
                    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">${bodyTx}</p>
                    <div style="background:#f4f5f7;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        ${row("KYC Ref", `<b style="font-family:monospace;">${kycRef}</b>`)}
                        ${row("Name", user.name || "—")}
                        ${row("Email", user.email || "—")}
                        ${row("Phone", user.phone || "—")}
                        ${row("Document Type", document_type)}
                        ${row("Doc Number", document_number)}
                        ${row("Submitted At", new Date().toLocaleString("en-NP"))}
                      </table>
                    </div>
                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;
                                padding:14px 18px;margin-bottom:24px;">
                      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                        ⏳ Status is <b>Pending</b>. Please review in the admin dashboard.
                      </p>
                    </div>
                  </td></tr>
                  ${emailFooter()}
                `),
              });
              console.log("✅ KYC submit email sent to admin");
            } catch (emailErr) {
              console.error("❌ KYC email error:", emailErr);
            }
          };

          /* ── Shared: notify admin in DB + socket ─────────────────── */
          const notifyAdmin = async (kycId, kycRef) => {
            const icon = isResubmit ? "🔄" : "📄";
            const title = isResubmit
              ? `KYC Re-submitted 🔄`
              : `New KYC Submitted 📄`;
            const message = isResubmit
              ? `${user.name} (${user.email}) re-submitted their KYC (${document_type}). Ref: ${kycRef}.`
              : `${user.name} (${user.email}) submitted KYC (${document_type}). Ref: ${kycRef}.`;

            try {
              await createAdminNotification({
                title,
                message,
                type: "kyc",
                ref_id: kycId,
                ref_type: "kyc",
                meta: {
                  user_id: userId,
                  user_name: user.name,
                  user_email: user.email,
                  document_type,
                  document_number,
                  is_resubmit: isResubmit,
                  kycRef,
                },
              });
              console.log("✅ KYC admin notification sent:", title);
            } catch (e) {
              console.warn("[submitKyc] Admin notification error:", e.message);
            }
          };

          if (isResubmit) {
            /* ── UPDATE existing KYC ──────────────────────────────── */
            db.query(
              `UPDATE kyc
               SET document_type=?, document_number=?,
                   document_front=?, document_back=?, selfie=?,
                   status='pending', rejection_reason=NULL, submitted_at=NOW()
               WHERE user_id=?`,
              [
                document_type,
                document_number,
                frontPath,
                backPath,
                selfiePath,
                userId,
              ],
              async (err3) => {
                if (err3) return res.status(500).json({ success: false });

                const kycId = existing[0].id;
                const kycRef = `KYC-${kycId}`;

                // ── Notify USER ─────────────────────────────────────
                try {
                  await createNotification({
                    user_id: userId,
                    title: "KYC Re-submitted ⏳",
                    message:
                      "Your updated KYC documents have been received and are under review. We'll notify you within 24–48 hours.",
                    type: "kyc",
                    target_role: "user",
                    meta: { kyc_status: "pending", kycRef },
                  });
                } catch (e) {
                  console.error("KYC user notification error:", e);
                }

                // ── Notify ADMIN ────────────────────────────────────
                await notifyAdmin(kycId, kycRef);

                // ── Email ADMIN ─────────────────────────────────────
                await sendAdminEmail(kycRef);

                res.json({
                  success: true,
                  message: "KYC updated",
                  ref: kycRef,
                });
              },
            );
          } else {
            /* ── INSERT new KYC ───────────────────────────────────── */
            db.query(
              `INSERT INTO kyc (
                user_id, document_type, document_number,
                document_front, document_back, selfie,
                status, submitted_at
              ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
              [
                userId,
                document_type,
                document_number,
                frontPath,
                backPath,
                selfiePath,
              ],
              async (err3, result) => {
                if (err3) return res.status(500).json({ success: false });

                const kycId = result.insertId;
                const kycRef = `KYC-${kycId}`;

                // ── Notify USER ─────────────────────────────────────
                try {
                  await createNotification({
                    user_id: userId,
                    title: "KYC Submitted ⏳",
                    message:
                      "Your KYC documents have been received and are under review. We'll notify you within 24–48 hours.",
                    type: "kyc",
                    target_role: "user",
                    meta: { kyc_status: "pending", kycRef },
                  });
                } catch (e) {
                  console.error("KYC user notification error:", e);
                }

                // ── Notify ADMIN ────────────────────────────────────
                await notifyAdmin(kycId, kycRef);

                // ── Email ADMIN ─────────────────────────────────────
                await sendAdminEmail(kycRef);

                res.json({
                  success: true,
                  message: "KYC submitted",
                  ref: kycRef,
                });
              },
            );
          }
        },
      );
    },
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   notifyKycStatusChange(userId, status, rejectionReason?)
   Called from admin.kyc.controller.js when admin approves/rejects KYC.
   Pushes notification to the USER only.
════════════════════════════════════════════════════════════════════════ */
exports.notifyKycStatusChange = async (
  userId,
  status,
  rejectionReason = null,
) => {
  const notifMap = {
    verified: {
      title: "KYC Verified ✅",
      message:
        "Your identity verification is complete! You can now make bookings without restrictions.",
    },
    rejected: {
      title: "KYC Rejected ❌",
      message: rejectionReason
        ? `Your KYC was rejected. Reason: "${rejectionReason}". Please go to the KYC page and resubmit with correct documents.`
        : "Your KYC was rejected. Please resubmit with clearer, valid documents.",
    },
  };

  const notif = notifMap[status];
  if (!notif) return;
};
