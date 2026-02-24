import supabase from "../supabase.js";

function getBearerToken(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
}

export async function requireAuthenticatedUser(req, res) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing Authorization bearer token." });
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: "Invalid or expired session token." });
    return null;
  }

  return data.user;
}

function normalizeRoleValue(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function isAdminFromClaims(user) {
  const metadataRole =
    normalizeRoleValue(user?.user_metadata?.role) ||
    normalizeRoleValue(user?.app_metadata?.role) ||
    normalizeRoleValue(user?.user_metadata?.account_type) ||
    normalizeRoleValue(user?.app_metadata?.account_type);

  return metadataRole === "admin";
}

function isAdminFromProfile(profileRow) {
  if (!profileRow || typeof profileRow !== "object") {
    return false;
  }

  if (profileRow.is_admin === true) {
    return true;
  }

  const roleValue =
    normalizeRoleValue(profileRow.role) ||
    normalizeRoleValue(profileRow.account_type);

  return roleValue === "admin";
}

export async function requireAdminUser(req, res) {
  const authUser = await requireAuthenticatedUser(req, res);
  if (!authUser) {
    return null;
  }

  if (isAdminFromClaims(authUser)) {
    return { user: authUser, profile: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (profileError) {
    res.status(500).json({
      error: profileError.message || "Unable to validate admin profile role.",
    });
    return null;
  }

  if (!isAdminFromProfile(profile)) {
    res.status(403).json({
      error: "Admin access required.",
    });
    return null;
  }

  return { user: authUser, profile };
}
