import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import bookingRoutes from "./routes/booking.js";
import adminRoutes from "./routes/admin.js";
import deviceRoutes from "./routes/device.js";
import gateRoutes from "./routes/gate.js";
import healthRoute from "./routes/health.js";
import sessionRoutes from "./routes/session.js";

dotenv.config();

const defaultOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
const envOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;
const productionOrigins = [
  "https://zlot-v1front.vercel.app",
  "https://www.zlot.co.in",
  "https://zlot.co.in",
];

function normalizeOrigin(origin) {
  return origin.replace(/\/+$/, "");
}

const normalizedAllowedOrigins = [...new Set([...allowedOrigins, ...productionOrigins])].map(
  normalizeOrigin
);

function isTrustedVercelFrontend(origin) {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    return hostname.endsWith(".vercel.app") && hostname.includes("zlot");
  } catch {
    return false;
  }
}

function isLocalNetworkFrontend(origin) {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" || parsed.port !== "3000") {
      return false;
    }

    const { hostname } = parsed;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return true;
    }

    if (hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
      return true;
    }

    return /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
  } catch {
    return false;
  }
}

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      const normalizedOrigin = typeof origin === "string" ? normalizeOrigin(origin) : origin;
      if (
        !normalizedOrigin ||
        normalizedAllowedOrigins.includes(normalizedOrigin) ||
        isTrustedVercelFrontend(normalizedOrigin) ||
        isLocalNetworkFrontend(normalizedOrigin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS_NOT_ALLOWED"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use("/", healthRoute);
app.use("/admin", adminRoutes);
app.use("/device", deviceRoutes);
app.use("/gate", gateRoutes);
app.use("/session", sessionRoutes);
app.use("/booking", bookingRoutes);

app.use((error, _req, res, next) => {
  if (error instanceof Error && error.message === "CORS_NOT_ALLOWED") {
    res.status(403).json({
      error: "CORS blocked this request origin.",
    });
    return;
  }
  next(error);
});

export function getAllowedOrigins() {
  return [...normalizedAllowedOrigins];
}

export default app;
