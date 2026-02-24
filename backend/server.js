import dotenv from "dotenv";

import app, { getAllowedOrigins } from "./app.js";

dotenv.config();

const port = Number.parseInt(process.env.PORT || "5000", 10);

function decodeJwtPayload(token) {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(payload, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

app.listen(port, () => {
  const tokenPayload = decodeJwtPayload(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const tokenRole = tokenPayload?.role;
  const serviceRoleLooksAnon = tokenRole === "anon";

  console.log(`Server running on port ${port}`);
  console.log("Allowed frontend origins:", getAllowedOrigins().join(", "));
  console.log("Supabase URL configured:", Boolean(process.env.SUPABASE_URL));
  console.log(
    "Service role key configured:",
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
  if (tokenRole) {
    console.log("Supabase key role:", tokenRole);
  }
  if (serviceRoleLooksAnon) {
    console.warn(
      "Warning: SUPABASE_SERVICE_ROLE_KEY appears to be an anon key. Use the service_role key for backend routes."
    );
  }
});
