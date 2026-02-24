import express from "express";

import { requireAuthenticatedUser } from "../lib/auth.js";

const router = express.Router();

const MAX_IMAGES = 8;
const FALLBACK_RECIPIENT = "zlotparking@gmail.com";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function normalizeText(value, maxLength = 500) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLength);
}

function normalizeFileNames(input, maxItems) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => normalizeText(String(item), 180))
    .filter(Boolean)
    .slice(0, maxItems);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailContent({
  payload,
  authUser,
  imageNames,
  videoName,
}) {
  const createdAt = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines = [
    "New ZLOT Space Provider Submission",
    "",
    `Owner Name: ${payload.owner_name}`,
    `Phone: ${payload.phone}`,
    `Contact Email: ${payload.email}`,
    `Space Name: ${payload.slot_name}`,
    `Location: ${payload.location}`,
    `Price / Hour (INR): ${payload.price_per_hour}`,
    `Availability: ${payload.availability || "-"}`,
    `Google Maps Link: ${payload.maps_link || "-"}`,
    `Notes: ${payload.notes || "-"}`,
    "",
    `Images (${imageNames.length}): ${imageNames.join(", ") || "-"}`,
    `Video: ${videoName || "-"}`,
    "",
    `Submitted by user id: ${authUser.id}`,
    `Submitted by auth email: ${authUser.email || "-"}`,
    `Submitted at: ${createdAt}`,
  ];

  const html = `
    <h2>New ZLOT Space Provider Submission</h2>
    <p><strong>Owner Name:</strong> ${escapeHtml(payload.owner_name)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(payload.phone)}</p>
    <p><strong>Contact Email:</strong> ${escapeHtml(payload.email)}</p>
    <p><strong>Space Name:</strong> ${escapeHtml(payload.slot_name)}</p>
    <p><strong>Location:</strong> ${escapeHtml(payload.location)}</p>
    <p><strong>Price / Hour (INR):</strong> ${escapeHtml(String(payload.price_per_hour))}</p>
    <p><strong>Availability:</strong> ${escapeHtml(payload.availability || "-")}</p>
    <p><strong>Google Maps Link:</strong> ${escapeHtml(payload.maps_link || "-")}</p>
    <p><strong>Notes:</strong> ${escapeHtml(payload.notes || "-")}</p>
    <p><strong>Images (${imageNames.length}):</strong> ${escapeHtml(imageNames.join(", ") || "-")}</p>
    <p><strong>Video:</strong> ${escapeHtml(videoName || "-")}</p>
    <hr />
    <p><strong>Submitted by user id:</strong> ${escapeHtml(authUser.id)}</p>
    <p><strong>Submitted by auth email:</strong> ${escapeHtml(authUser.email || "-")}</p>
    <p><strong>Submitted at:</strong> ${escapeHtml(createdAt)}</p>
  `;

  return {
    subject: `New space submission: ${payload.slot_name} (${payload.owner_name})`,
    text: lines.join("\n"),
    html,
  };
}

async function sendWithResend({
  to,
  subject,
  text,
  html,
  replyTo,
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL || "ZLOT Team <onboarding@resend.dev>";

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY in backend environment.");
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [to],
      subject,
      text,
      html,
      reply_to: replyTo || undefined,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      `Email provider rejected request with status ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

router.post("/submission", async (req, res) => {
  try {
    const authUser = await requireAuthenticatedUser(req, res);
    if (!authUser) {
      return;
    }

    const owner_name = normalizeText(req.body?.owner_name, 120);
    const phone = normalizeText(req.body?.phone, 40);
    const email = normalizeText(req.body?.email, 180);
    const slot_name = normalizeText(req.body?.slot_name, 160);
    const location = normalizeText(req.body?.location, 400);
    const maps_link = normalizeText(req.body?.maps_link, 500);
    const availability = normalizeText(req.body?.availability, 80);
    const notes = normalizeText(req.body?.notes, 2000);
    const price_per_hour = Number(req.body?.price_per_hour);

    const image_names = normalizeFileNames(req.body?.image_names, MAX_IMAGES);
    const video_name = normalizeText(req.body?.video_name, 180) || null;

    if (!owner_name || !phone || !email || !slot_name || !location) {
      return res.status(400).json({
        error: "owner_name, phone, email, slot_name, and location are required.",
      });
    }

    if (!Number.isFinite(price_per_hour) || price_per_hour <= 0) {
      return res.status(400).json({
        error: "price_per_hour must be a positive number.",
      });
    }

    if (image_names.length === 0) {
      return res.status(400).json({
        error: "Provide at least one image file name in image_names.",
      });
    }

    const normalizedPayload = {
      owner_name,
      phone,
      email,
      slot_name,
      location,
      price_per_hour: Math.round(price_per_hour),
      maps_link,
      availability,
      notes,
    };

    const content = buildEmailContent({
      payload: normalizedPayload,
      authUser,
      imageNames: image_names,
      videoName: video_name,
    });

    const recipient = process.env.OWNER_SUBMISSION_EMAIL || FALLBACK_RECIPIENT;

    const providerResponse = await sendWithResend({
      to: recipient,
      subject: content.subject,
      text: content.text,
      html: content.html,
      replyTo: email,
    });

    return res.status(201).json({
      message: "Submission sent to ZLOT team email.",
      email_id: providerResponse?.id || null,
      recipient,
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to send submission email.",
    });
  }
});

export default router;
