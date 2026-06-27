/**
 * ============================================================
 *  SEKANI STUDIO — Frontend Form Handler
 *  File: backend/mailer.js
 *
 *  Wires up the contact form to the Node.js backend API.
 *  When a user submits the form, this script sends a POST
 *  request to /api/contact. The backend server then emails
 *  the submission to arinzesolomon03@gmail.com via Gmail SMTP.
 *
 *  NO credentials live here — all secrets are in backend/.env
 * ============================================================
 */

"use strict";

// ── API endpoint (same origin — server serves both) ──────────
const API_URL = "/api/contact";

/**
 * Submits the contact form data to the backend API.
 * @param {Object} formData - Key/value pairs of form fields
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function submitContactForm(formData) {
    const response = await fetch(API_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Server error. Please try again.");
    }

    return data;
}

/**
 * Handles form submit event end-to-end:
 *  1. Prevents default HTML form submission
 *  2. Collects all field values
 *  3. Shows a loading spinner on the button
 *  4. Calls the backend API
 *  5. Shows a success or error toast
 *
 * @param {Event} event - The form submit event
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    const form      = document.getElementById("contact-form");
    const submitBtn = document.getElementById("b1");

    // ── Collect form values ──────────────────────────────────
    const formData = {
        fname:    document.getElementById("fname").value.trim(),
        email:    document.getElementById("email").value.trim(),
        bname:    document.getElementById("bname").value.trim(),
        nservice: document.getElementById("nservice").value,
        budget:   document.getElementById("budget").value,
        desc:     document.getElementById("desc").value.trim(),
    };

    // ── Show loading state ───────────────────────────────────
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="btn-spinner"></span>Sending…`;

    try {
        // ── POST to backend ──────────────────────────────────
        const result = await submitContactForm(formData);

        // ✅ Success
        form.reset();
        showMailerToast("success", "Inquiry Sent!", result.message);

    } catch (error) {
        // ❌ Error
        console.error("[Mailer] Submission error:", error.message);
        showMailerToast("error", "Send Failed", error.message || "Something went wrong. Please try again.");

    } finally {
        // Restore button regardless of outcome
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
    }
}

/**
 * Shows a toast notification.
 *
 * @param {"success"|"error"} type
 * @param {string} title
 * @param {string} message
 */
function showMailerToast(type, title, message) {
    const toast      = document.getElementById("toast-notification");
    const icon       = toast ? toast.querySelector(".toast-icon") : null;
    const toastTitle = document.getElementById("toast-title");
    const toastMsg   = document.getElementById("toast-message");

    if (!toast || !toastTitle || !toastMsg) return;

    toastTitle.textContent = title;
    toastMsg.textContent   = message;

    if (type === "error") {
        toast.style.borderColor = "#ef4444";
        if (icon) {
            icon.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
            icon.textContent      = "!";
        }
    } else {
        toast.style.borderColor = "";
        if (icon) {
            icon.style.background = "";
            icon.textContent      = "\u2713";
        }
    }

    // Support both .active (day16.css) and .show classes
    toast.classList.add("active", "show");

    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
        toast.classList.remove("active", "show");
    }, 5000);
}

// ── Attach form listener on DOM ready ────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contact-form");
    if (form) {
        form.addEventListener("submit", handleFormSubmit);
        console.log("[Mailer] Contact form -> /api/contact ready");
    }
});
