/**
 * ============================================================
 *  SEKANI STUDIO — Node.js/Express Backend Server
 *  File: backend/server.js
 *
 *  - Serves the frontend (index.html + all static files)
 *    on http://localhost:3000
 *  - Exposes POST /api/contact to receive form submissions
 *    and email them via Gmail SMTP (Nodemailer)
 *  - Reads credentials safely from backend/.env
 * ============================================================
 */

"use strict";

const path       = require("path");
const express    = require("express");
const nodemailer = require("nodemailer");
const cors       = require("cors");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Serve the frontend (LearningFolder root) ─────────────────
// Everything one level up from /backend is treated as static files
const FRONTEND_ROOT = path.join(__dirname, "..");
app.use(express.static(FRONTEND_ROOT));

// ── Middleware ────────────────────────────────────────────────
app.use(cors());                            // allow browser fetch calls
app.use(express.json());                    // parse JSON request bodies
app.use(express.urlencoded({ extended: true }));

// ── Nodemailer transporter (Gmail SMTP) ──────────────────────
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

// Verify SMTP connection on startup
transporter.verify((error) => {
    if (error) {
        console.error("[Mailer] SMTP connection FAILED:", error.message);
        console.error("         Check GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env");
    } else {
        console.log("[Mailer] Gmail SMTP connected and ready to send mail");
    }
});

// ── POST /api/contact ─────────────────────────────────────────
app.post("/api/contact", async (req, res) => {
    const { fname, email, bname, nservice, budget, desc } = req.body;

    // Basic server-side validation
    if (!fname || !email || !nservice || !budget || !desc) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields. Please fill in all required inputs.",
        });
    }

    // Build the email
    const mailOptions = {
        from:    `"Sekani Studio Contact Form" <${process.env.GMAIL_USER}>`,
        to:      process.env.RECIPIENT_EMAIL,
        replyTo: email,
        subject: `New Inquiry from ${fname} — Sekani Studio`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body        { font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0; }
    .wrapper    { max-width:600px; margin:30px auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08); }
    .header     { background:linear-gradient(135deg,#060913,#0c1222); padding:30px 40px; text-align:center; }
    .header h1  { color:#00d2ff; font-size:22px; margin:0; letter-spacing:1px; }
    .header p   { color:#9ca3af; font-size:13px; margin:8px 0 0; }
    .body       { padding:30px 40px; }
    .field      { margin-bottom:20px; border-bottom:1px solid #f0f0f0; padding-bottom:15px; }
    .field:last-child { border-bottom:none; }
    .label      { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#9ca3af; margin-bottom:5px; }
    .value      { font-size:15px; color:#1a1a2e; font-weight:500; }
    .footer     { background:#f9fafb; text-align:center; padding:20px; font-size:12px; color:#9ca3af; }
    .badge      { display:inline-block; background:#00d2ff22; color:#00d2ff; border:1px solid #00d2ff55; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>SekaniStudio</h1>
      <p>New Contact Form Submission</p>
    </div>
    <div class="body">
      <div class="field">
        <div class="label">Full Name</div>
        <div class="value">${escapeHtml(fname)}</div>
      </div>
      <div class="field">
        <div class="label">Email Address</div>
        <div class="value"><a href="mailto:${escapeHtml(email)}" style="color:#00d2ff;">${escapeHtml(email)}</a></div>
      </div>
      <div class="field">
        <div class="label">Business Name</div>
        <div class="value">${escapeHtml(bname) || "<em style='color:#ccc'>Not provided</em>"}</div>
      </div>
      <div class="field">
        <div class="label">Service Needed</div>
        <div class="value"><span class="badge">${escapeHtml(nservice)}</span></div>
      </div>
      <div class="field">
        <div class="label">Project Budget</div>
        <div class="value">${escapeHtml(budget)}</div>
      </div>
      <div class="field">
        <div class="label">Project Description</div>
        <div class="value">${escapeHtml(desc)}</div>
      </div>
    </div>
    <div class="footer">
      Sent via Sekani Studio contact form &nbsp;&bull;&nbsp; Reply directly to respond to ${escapeHtml(fname)}
    </div>
  </div>
</body>
</html>
        `.trim(),
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Contact] Email sent from ${email} (${fname})`);
        return res.status(200).json({
            success: true,
            message: "Your inquiry has been sent! We will get back to you shortly.",
        });
    } catch (err) {
        console.error("[Contact] Failed to send email:", err.message);
        return res.status(500).json({
            success: false,
            message: "Server error: could not send email. Please try again later.",
        });
    }
});

// ── Catch-all: serve index.html for any unknown route ────────
app.get("*", (req, res) => {
    res.sendFile(path.join(FRONTEND_ROOT, "index.html"));
});

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
    console.log("");
    console.log("  +-----------------------------------------+");
    console.log("  |   Sekani Studio  --  Server Running     |");
    console.log("  +-----------------------------------------+");
    console.log(`  |  Frontend:  http://localhost:${PORT}        |`);
    console.log(`  |  API:       http://localhost:${PORT}/api/contact |`);
    console.log("  +-----------------------------------------+");
    console.log("");
    console.log("  Press Ctrl+C to stop.");
    console.log("");
});

// ── Helper: escape HTML to prevent XSS in email ──────────────
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
