// admin.enquiry.controller.js
const db = require("../config/db");
const transporter = require("../utils/mailer");

// GET ALL ENQUIRIES
exports.getAllEnquiries = (req, res) => {
  const sql = `
    SELECT e.*, u.name AS user_name, u.email AS user_email
    FROM enquiries e
    JOIN users u ON e.user_id = u.id
    ORDER BY e.created_at DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
};

// GET SINGLE ENQUIRY
exports.getEnquiryById = (req, res) => {
  const sql = `
    SELECT e.*, u.name AS user_name, u.email AS user_email
    FROM enquiries e
    JOIN users u ON e.user_id = u.id
    WHERE e.id = ?
  `;
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0)
      return res.status(404).json({ message: "Enquiry not found" });
    res.json(result[0]);
  });
};

// REPLY ENQUIRY — saves reply + emails the customer
exports.replyEnquiry = async (req, res) => {
  const { reply } = req.body;
  if (!reply || !reply.trim())
    return res.status(400).json({ message: "Reply text is required" });

  const enquiryId = req.params.id;

  // 1. Fetch the enquiry so we have the customer name, email, question
  const fetchSql = `
    SELECT e.*, u.name AS user_name, u.email AS user_email
    FROM enquiries e
    JOIN users u ON e.user_id = u.id
    WHERE e.id = ?
  `;

  db.query(fetchSql, [enquiryId], async (fetchErr, rows) => {
    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (!rows.length)
      return res.status(404).json({ message: "Enquiry not found" });

    const enquiry = rows[0];

    // 2. Save the reply + mark as Replied
    const updateSql = `
      UPDATE enquiries
      SET admin_reply = ?, status = 'Replied'
      WHERE id = ?
    `;

    db.query(updateSql, [reply.trim(), enquiryId], async (updateErr) => {
      if (updateErr) return res.status(500).json({ error: updateErr.message });

      // 3. Send email to customer — non-blocking (failure won't break the response)
      try {
        await transporter.sendMail({
          from: `"Auto Dealer Support" <${process.env.EMAIL_USER}>`,
          to: enquiry.email || enquiry.user_email,
          subject: `Re: Your Enquiry — Auto Dealer`,
          text: `
Hi ${enquiry.name || enquiry.user_name},

Thank you for reaching out to Auto Dealer. Here is our response to your enquiry:

──────────────────────────────
Your Question:
${enquiry.question}
──────────────────────────────
Our Reply:
${reply.trim()}
──────────────────────────────

If you have further questions, feel free to submit a new enquiry through our website.

Warm regards,
Auto Dealer Support Team
          `.trim(),

          html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:#0a0a0a;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#ff5c1a;border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                          <span style="color:#fff;font-size:12px;font-weight:700;font-family:monospace;">AD</span>
                        </td>
                        <td style="padding-left:12px;">
                          <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:2px;font-family:monospace;">AUTO DEALER</div>
                          <div style="color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:1.5px;font-family:monospace;">SUPPORT TEAM</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <span style="background:#ff5c1a;color:#fff;font-size:11px;font-weight:600;padding:5px 12px;border-radius:99px;">Enquiry Replied</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#111827;">Hi ${enquiry.name || enquiry.user_name},</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                Thank you for contacting Auto Dealer. We've responded to your enquiry below.
              </p>

              <!-- Question box -->
              <div style="background:#f4f5f7;border-radius:8px;padding:16px 20px;margin-bottom:16px;">
                <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9ca3af;font-family:monospace;">Your Question</p>
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${enquiry.question}</p>
              </div>

              <!-- Reply box -->
              <div style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
                <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#16a34a;font-family:monospace;">Our Reply</p>
                <p style="margin:0;font-size:14px;color:#166534;line-height:1.7;">${reply.trim().replace(/\n/g, "<br>")}</p>
              </div>

              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                Have more questions? Feel free to submit a new enquiry anytime through our website.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                © ${new Date().getFullYear()} Auto Dealer · Fleet Management System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `.trim(),
        });
      } catch (emailErr) {
        // Log but don't fail the request — reply is already saved
        console.error("Enquiry reply email error:", emailErr);
      }

      res.json({ message: "Reply sent successfully" });
    });
  });
};

// UPDATE STATUS (Pending | Replied | Closed)
exports.updateStatus = (req, res) => {
  const { status } = req.body;
  const allowed = ["Pending", "Replied", "Closed"];
  if (!allowed.includes(status))
    return res.status(400).json({ message: "Invalid status value" });

  const sql = `UPDATE enquiries SET status = ? WHERE id = ?`;
  db.query(sql, [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Enquiry marked as ${status}` });
  });
};

// CLOSE ENQUIRY
exports.closeEnquiry = (req, res) => {
  const sql = `UPDATE enquiries SET status = 'Closed' WHERE id = ?`;
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Enquiry closed" });
  });
};

// DELETE ENQUIRY
exports.deleteEnquiry = (req, res) => {
  const sql = `DELETE FROM enquiries WHERE id = ?`;
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Enquiry deleted successfully" });
  });
};
