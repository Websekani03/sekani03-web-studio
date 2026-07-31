/**
 * ============================================================
 *  SEKANI STUDIO � Google Calendar Booking Module
 *  File: backend/calendar.js
 *
 *  Handles POST /api/book-consultation:
 *  - Authenticates via Service Account JSON key
 *    (file locally, env var on Render)
 *  - Creates a Google Calendar event with a Google Meet link
 *  - Adds the user as an attendee so Google sends them an invite
 *  - Sets 24h + 30min email reminders
 * ============================================================
 */

"use strict";

const { google } = require("googleapis");

// -- Authenticate using Service Account ------------------------
// Authenticates via environment variables: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY
function getCalendarClient() {
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    if (privateKey) {
        privateKey = privateKey.trim();
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
        } else if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
            privateKey = privateKey.slice(1, -1);
        }
        privateKey = privateKey.replace(/\\n/g, "\n");
    }

    let clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    if (clientEmail) {
        clientEmail = clientEmail.trim();
        if (clientEmail.startsWith('"') && clientEmail.endsWith('"')) {
            clientEmail = clientEmail.slice(1, -1);
        } else if (clientEmail.startsWith("'") && clientEmail.endsWith("'")) {
            clientEmail = clientEmail.slice(1, -1);
        }
    }

    if (!clientEmail || !privateKey) {
        throw new Error(
            "Missing Google Service Account credentials. " +
            "Please configure GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in your environment variables."
        );
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
        scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    return google.calendar({ version: "v3", auth });
}

// -- Route Handler: POST /api/book-consultation ----------------
async function bookConsultation(req, res) {
    // Guard check for missing environment variables on Vercel
    const missingKeys = [];
    if (!process.env.GOOGLE_CLIENT_EMAIL) missingKeys.push("GOOGLE_CLIENT_EMAIL");
    if (!process.env.GOOGLE_PRIVATE_KEY) missingKeys.push("GOOGLE_PRIVATE_KEY");
    if (!process.env.GOOGLE_CALENDAR_ID) missingKeys.push("GOOGLE_CALENDAR_ID");
    if (missingKeys.length > 0) {
        return res.status(500).json({
            success: false,
            message: `Server configuration error: Missing environment variable(s): ${missingKeys.join(", ")}. Please configure them in your Vercel Project Settings (Environment Variables) and ensure they are assigned to Production/Preview.`,
        });
    }

    const { name, email, date, time, service, notes } = req.body;

    // 1. Validate required fields
    if (!name || !email || !date || !time) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields: name, email, date, and time are required.",
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email address.",
        });
    }

    // 2. Build start and end DateTime
    const startDateTime = new Date(`${date}T${time}:00`);
    if (isNaN(startDateTime.getTime())) {
        return res.status(400).json({
            success: false,
            message: "Invalid date or time format.",
        });
    }

    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // +1 hour

    // 3. Build the Calendar Event resource
    const event = {
        summary: `Consultation with ${name} � Sekani Studio`,
        description: [
            `Client Name: ${name}`,
            `Client Email: ${email}`,
            service ? `Service of Interest: ${service}` : null,
            notes ? `Additional Notes:\n${notes}` : null,
            "",
            "Booked via Sekani Studio booking form.",
        ]
            .filter((line) => line !== null)
            .join("\n"),

        start: {
            dateTime: startDateTime.toISOString(),
            timeZone: "Africa/Lagos",
        },
        end: {
            dateTime: endDateTime.toISOString(),
            timeZone: "Africa/Lagos",
        },

        // Google automatically emails a Calendar invite to every attendee listed here
        attendees: [
            { email: email, displayName: name },
        ],

        // conferenceData � forces Google to generate a Meet link
        // IMPORTANT: conferenceDataVersion: 1 MUST also be set in the insert() call
        conferenceData: {
            createRequest: {
                requestId: `sekani-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                conferenceSolutionKey: {
                    type: "hangoutsMeet",
                },
            },
        },

        reminders: {
            useDefault: false,
            overrides: [
                { method: "email", minutes: 24 * 60 },
                { method: "email", minutes: 30 },
                { method: "popup", minutes: 10 },
            ],
        },

        colorId: "9", // Blueberry (dark blue)
    };

    // 4. Insert the event via the Calendar API
    try {
        const calendar = getCalendarClient();
        const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

        const response = await calendar.events.insert({
            calendarId,
            resource: event,
            // CRITICAL: Must be 1 to generate the Meet link
            conferenceDataVersion: 1,
            // "all" = Google emails the calendar invite to all attendees automatically
            sendUpdates: "all",
        });

        const created = response.data;
        const meetLink =
            created.conferenceData?.entryPoints?.find(
                (ep) => ep.entryPointType === "video"
            )?.uri || null;

        console.log(`[Calendar] Event created: ${created.id}`);
        console.log(`[Calendar]    Client: ${name} <${email}>`);
        console.log(`[Calendar]    Time:   ${startDateTime.toLocaleString()}`);
        console.log(`[Calendar]    Meet:   ${meetLink ?? "not generated"}`);

        return res.status(200).json({
            success: true,
            message: "Consultation booked! Check your email for the Google Calendar invite with a Google Meet link.",
            eventId: created.id,
            eventUrl: created.htmlLink,
            meetLink: meetLink,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
        });
    } catch (err) {
        console.error("[Calendar] Failed to create event:", err);

        if (err.code === 403 || err.message?.includes("SERVICE_DISABLED")) {
            return res.status(500).json({
                success: false,
                message: `Google Calendar API not enabled or service account lacks calendar access. Details: ${err.message}`,
            });
        }
        if (err.code === 404) {
            return res.status(500).json({
                success: false,
                message: `Calendar not found. Check GOOGLE_CALENDAR_ID. Details: ${err.message}`,
            });
        }

        return res.status(500).json({
            success: false,
            message: `Could not book the consultation. Details: ${err.message}`,
        });
    }
}

module.exports = { bookConsultation };
