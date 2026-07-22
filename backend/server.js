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
 *  - /health endpoint for uptime monitoring & keep-alive pings
 *  - Self-pings every 14 min to prevent Render free-tier cold starts
 * ============================================================
 */

"use strict";

const path       = require("path");
const express    = require("express");
const nodemailer = require("nodemailer");
const cors       = require("cors");
const http       = require("http");
const https      = require("https");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// ── Google Calendar booking module ────────────────────────────
const { bookConsultation } = require("./calendar");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Check required environment variables on startup ──────────
const REQUIRED_ENV = ["GMAIL_USER", "GMAIL_APP_PASSWORD", "RECIPIENT_EMAIL"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
    console.warn("[ENV] WARNING: Missing environment variables:", missingEnv.join(", "));
    console.warn("[ENV] Contact form emails will NOT be sent until these are set.");
    console.warn("[ENV] On Render: go to Environment tab and add these variables.");
}

// Check calendar credentials
const hasCalendarCredentials = process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;
if (!hasCalendarCredentials) {
    console.warn("[ENV] WARNING: Missing Google Calendar credentials.");
    console.warn("[ENV] Please set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in backend/.env");
}

// ── Serve the frontend (LearningFolder root) ─────────────────
// Everything one level up from /backend is treated as static files
const FRONTEND_ROOT = path.join(__dirname, "..");
app.use(express.static(FRONTEND_ROOT));

// ── Middleware ────────────────────────────────────────────────
app.use(cors({                              // allow browser fetch calls
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
}));
app.use(express.json());                    // parse JSON request bodies
app.use(express.urlencoded({ extended: true }));

// ── Health check endpoint (for UptimeRobot / keep-alive pings) ──
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "Sekani Studio Backend",
        timestamp: new Date().toISOString(),
    });
});

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

// ── POST /api/book-consultation ──────────────────────────────
// Creates a Google Calendar event with a Meet link and emails the attendee.
app.post("/api/book-consultation", bookConsultation);

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
    console.log(`  |  Health:    http://localhost:${PORT}/health      |`);
    console.log("  +-----------------------------------------+");
    console.log("");
    console.log("  Press Ctrl+C to stop.");
    console.log("");

    // ── Self-ping keep-alive (prevents Render free tier cold starts) ──
    // Pings the /health endpoint every 14 minutes to keep the server warm.
    // On Render free tier, services sleep after 15 minutes of inactivity.
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
    if (RENDER_URL) {
        const pingUrl = `${RENDER_URL}/health`;
        const pingInterval = 14 * 60 * 1000; // 14 minutes
        const pingFn = RENDER_URL.startsWith("https") ? https : http;

        setInterval(() => {
            pingFn.get(pingUrl, (res) => {
                console.log(`[KeepAlive] Pinged ${pingUrl} — status: ${res.statusCode}`);
            }).on("error", (err) => {
                console.warn(`[KeepAlive] Ping failed: ${err.message}`);
            });
        }, pingInterval);

        console.log(`[KeepAlive] Self-ping enabled → ${pingUrl} every 14 min`);
    } else {
        console.log("[KeepAlive] RENDER_EXTERNAL_URL not set — self-ping disabled (local dev mode)");
    }
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
