const db = require("../config/db");
const transporter = require("../utils/mailer");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";

// ── email helpers ─────────────────────────────────────────────────────────
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

const row = (label, value) => `
  <tr>
    <td style="padding:10px 0;font-size:12px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;
               color:#9ca3af;font-family:monospace;width:40%;border-bottom:1px solid #f3f4f6;">${label}</td>
    <td style="padding:10px 0;font-size:14px;color:#111827;border-bottom:1px solid #f3f4f6;">${value}</td>
  </tr>`;

// shared email sender — called after both INSERT and UPDATE
const sendKycSubmitEmail = async ({
  kycRef,
  isResubmit,
  userName,
  userEmail,
  userPhone,
  docType,
  docNumber,
}) => {
  const tagLabel = isResubmit ? "KYC Re-submitted" : "New KYC Submission";
  const headingTx = isResubmit
    ? "KYC Re-submitted for Review"
    : "New KYC Submission Received";
  const bodyTx = isResubmit
    ? `<b>${userName}</b> has re-submitted their KYC documents after a previous rejection. Please review the updated documents in the admin dashboard.`
    : `A new KYC submission has been received from <b>${userName}</b>. Please review and verify their documents in the admin dashboard.`;

  await transporter.sendMail({
    from: `"Auto Dealer System" <${process.env.EMAIL_USER}>`,
    to: ADMIN_EMAIL,
    subject: `${tagLabel} — ${kycRef}`,
    html: emailWrapper(`
      ${emailHeader(tagLabel)}
      <tr><td style="padding:32px;">
        <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#111827;">${headingTx}</p>
        <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">${bodyTx}</p>

        <!-- applicant details -->
        <div style="background:#f4f5f7;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row("KYC Ref", `<b style="font-family:monospace;">${kycRef}</b>`)}
            ${row("Name", userName)}
            ${row("Email", userEmail)}
            ${row("Phone", userPhone || "—")}
            ${row("Document Type", docType)}
            ${row("Doc Number", docNumber)}
            ${row("Submitted At", new Date().toLocaleString("en-NP"))}
          </table>
        </div>

        <!-- status pill -->
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
            ⏳ Status is <b>Pending</b>. Please log in to the admin dashboard to review the submitted documents and update the KYC status.
          </p>
        </div>

        <p style="margin:0;font-size:13px;color:#9ca3af;">
          This is an automated notification from the Auto Dealer system.
        </p>
      </td></tr>
      ${emailFooter()}
    `),
  });
};

// ───────── USER INFO ─────────
exports.getUserInfo = (req, res) => {
  const userId = req.session?.user?.id;
  if (!userId)
    return res.status(401).json({ success: false, message: "Not logged in" });

  db.query(
    "SELECT id, name, email, phone FROM users WHERE id=?",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true, data: result[0] });
    },
  );
};

// ───────── STATUS ─────────
exports.getKycStatus = (req, res) => {
  const userId = req.session?.user?.id;
  if (!userId) return res.status(401).json({ success: false });

  db.query(
    "SELECT * FROM kyc WHERE user_id=? LIMIT 1",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true, data: result[0] || null });
    },
  );
};

// ───────── SUBMIT KYC (MULTER) ─────────
exports.submitKyc = (req, res) => {
  const userId = req.session?.user?.id;
  if (!userId)
    return res.status(401).json({ success: false, message: "Not logged in" });

  const { document_type, document_number } = req.body;
  if (!document_type || !document_number)
    return res.status(400).json({ success: false });

  const front = req.files?.document_front?.[0];
  const back = req.files?.document_back?.[0];
  const selfie = req.files?.selfie?.[0];

  if (!front || !back || !selfie) {
    return res
      .status(400)
      .json({ success: false, message: "All documents required" });
  }

  const frontPath = `/uploads/kyc/${front.filename}`;
  const backPath = `/uploads/kyc/${back.filename}`;
  const selfiePath = `/uploads/kyc/${selfie.filename}`;

  // fetch user info needed for the email
  db.query(
    "SELECT name, email, phone FROM users WHERE id=?",
    [userId],
    (err, userRows) => {
      if (err) return res.status(500).json({ success: false });

      const user = userRows[0] || {};

      // check for existing KYC
      db.query(
        "SELECT id FROM kyc WHERE user_id=?",
        [userId],
        async (err2, existing) => {
          if (err2) return res.status(500).json({ success: false });

          const isResubmit = existing.length > 0;

          if (isResubmit) {
            // ── UPDATE ──────────────────────────────────────────────────────
            db.query(
              `UPDATE kyc SET
            document_type=?, document_number=?,
            document_front=?, document_back=?, selfie=?,
            status='pending', submitted_at=NOW()
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

                const kycRef = `KYC-${existing[0].id}`;

                // notify admin — non-blocking
                try {
                  await sendKycSubmitEmail({
                    kycRef,
                    isResubmit: true,
                    userName: user.name || "Unknown",
                    userEmail: user.email || "—",
                    userPhone: user.phone || "—",
                    docType: document_type,
                    docNumber: document_number,
                  });
                  console.log("✅ KYC re-submit email sent to admin");
                } catch (emailErr) {
                  console.error("❌ KYC re-submit email error:", emailErr);
                }

                res.json({
                  success: true,
                  message: "KYC updated",
                  ref: kycRef,
                });
              },
            );
          } else {
            // ── INSERT ──────────────────────────────────────────────────────
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

                const kycRef = `KYC-${result.insertId}`;

                // notify admin — non-blocking
                try {
                  await sendKycSubmitEmail({
                    kycRef,
                    isResubmit: false,
                    userName: user.name || "Unknown",
                    userEmail: user.email || "—",
                    userPhone: user.phone || "—",
                    docType: document_type,
                    docNumber: document_number,
                  });
                  console.log("✅ KYC submit email sent to admin");
                } catch (emailErr) {
                  console.error("❌ KYC submit email error:", emailErr);
                }

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
