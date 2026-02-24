import crypto from "crypto";
import express from "express";

import { requireAuthenticatedUser } from "../lib/auth.js";
import supabase from "../supabase.js";

const router = express.Router();

const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 12 * 1024 * 1024;
const FALLBACK_RECIPIENT = "zlotparking@gmail.com";
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const OWNER_MEDIA_BUCKET = process.env.OWNER_MEDIA_BUCKET || "owner-submissions";

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

function normalizeBase64Files(input, maxItems) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .slice(0, maxItems)
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const name = normalizeText(item.name, 180);
      const contentType = normalizeText(item.content_type, 120).toLowerCase();
      const dataBase64 = normalizeText(item.data_base64, 20 * 1024 * 1024);

      if (!name || !contentType || !dataBase64) {
        return null;
      }

      return {
        name,
        content_type: contentType,
        data_base64: dataBase64,
      };
    })
    .filter(Boolean);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeFileName(fileName) {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized || "upload.bin";
}

function decodeBase64File(file, maxBytes) {
  const buffer = Buffer.from(file.data_base64, "base64");
  if (!buffer.length) {
    throw new Error(`Uploaded file ${file.name} is empty.`);
  }
  if (buffer.length > maxBytes) {
    throw new Error(`Uploaded file ${file.name} exceeds size limit.`);
  }
  return buffer;
}

async function uploadMediaFiles({ authUserId, images, video }) {
  const submissionRef = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const imageLinks = [];
  let videoLink = null;

  for (const [index, image] of images.entries()) {
    if (!image.content_type.startsWith("image/")) {
      throw new Error(`Image ${image.name} has invalid content type.`);
    }

    const buffer = decodeBase64File(image, MAX_IMAGE_BYTES);
    const fileName = `${index + 1}-${sanitizeFileName(image.name)}`;
    const path = `${authUserId}/${submissionRef}/images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(OWNER_MEDIA_BUCKET)
      .upload(path, buffer, {
        contentType: image.content_type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "Failed to upload image.");
    }

    const { data } = supabase.storage.from(OWNER_MEDIA_BUCKET).getPublicUrl(path);
    imageLinks.push({
      name: image.name,
      url: data.publicUrl,
    });
  }

  if (video) {
    if (!video.content_type.startsWith("video/")) {
      throw new Error(`Video ${video.name} has invalid content type.`);
    }

    const buffer = decodeBase64File(video, MAX_VIDEO_BYTES);
    const fileName = sanitizeFileName(video.name);
    const path = `${authUserId}/${submissionRef}/video/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(OWNER_MEDIA_BUCKET)
      .upload(path, buffer, {
        contentType: video.content_type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "Failed to upload video.");
    }

    const { data } = supabase.storage.from(OWNER_MEDIA_BUCKET).getPublicUrl(path);
    videoLink = {
      name: video.name,
      url: data.publicUrl,
    };
  }

  return { imageLinks, videoLink };
}

function buildEmailContent({
  payload,
  authUser,
  imageNames,
  videoName,
  imageLinks,
  videoLink,
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
  ];

  if (imageLinks.length > 0) {
    lines.push("");
    lines.push("Image links:");
    imageLinks.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.name} -> ${item.url}`);
    });
  }

  lines.push(`Video: ${videoName || "-"}`);
  if (videoLink) {
    lines.push(`Video link: ${videoLink.url}`);
  }

  lines.push("");
  lines.push(`Submitted by user id: ${authUser.id}`);
  lines.push(`Submitted by auth email: ${authUser.email || "-"}`);
  lines.push(`Submitted at: ${createdAt}`);

  const imageLinksHtml =
    imageLinks.length === 0
      ? "<p><strong>Image links:</strong> -</p>"
      : `<p><strong>Image links:</strong></p><ol>${imageLinks
          .map(
            (item) =>
              `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(
                item.name
              )}</a></li>`
          )
          .join("")}</ol>`;

  const videoLinkHtml = videoLink
    ? `<p><strong>Video link:</strong> <a href="${escapeHtml(
        videoLink.url
      )}" target="_blank" rel="noreferrer">${escapeHtml(videoLink.name)}</a></p>`
    : "<p><strong>Video link:</strong> -</p>";

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
    ${imageLinksHtml}
    <p><strong>Video:</strong> ${escapeHtml(videoName || "-")}</p>
    ${videoLinkHtml}
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

async function sendWithResend({ to, subject, text, html, replyTo }) {
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

    const images_base64 = normalizeBase64Files(req.body?.images_base64, MAX_IMAGES);
    const rawVideoBase64 = req.body?.video_base64;
    const video_base64 =
      rawVideoBase64 && typeof rawVideoBase64 === "object"
        ? normalizeBase64Files([rawVideoBase64], 1)[0] || null
        : null;

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

    if (image_names.length === 0 && images_base64.length === 0) {
      return res.status(400).json({
        error:
          "Provide at least one image. Use image_names (legacy) or images_base64 (with data).",
      });
    }

    let imageLinks = [];
    let videoLink = null;

    if (images_base64.length > 0 || video_base64) {
      const uploaded = await uploadMediaFiles({
        authUserId: authUser.id,
        images: images_base64,
        video: video_base64,
      });
      imageLinks = uploaded.imageLinks;
      videoLink = uploaded.videoLink;
    }

    const resolvedImageNames =
      images_base64.length > 0 ? images_base64.map((item) => item.name) : image_names;
    const resolvedVideoName = video_base64?.name || video_name;

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
      imageNames: resolvedImageNames,
      videoName: resolvedVideoName,
      imageLinks,
      videoLink,
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
      media: {
        images_uploaded: imageLinks.length,
        video_uploaded: Boolean(videoLink),
      },
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to send submission email.",
    });
  }
});

export default router;
