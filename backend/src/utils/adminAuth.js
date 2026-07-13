const crypto = require("crypto");

const DEFAULT_ADMIN_EMAIL = "admin@desichamak.com";
const DEFAULT_ADMIN_PASSWORD = "DesiChamak@123";
const DEFAULT_SESSION_SECRET = "desi_chamak_admin_secret";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
}

function getAdminPassword() {
  return String(process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD);
}

function getSessionSecret() {
  return String(process.env.ADMIN_SESSION_SECRET || DEFAULT_SESSION_SECRET);
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding ? normalized + "=".repeat(4 - padding) : normalized;

  return Buffer.from(padded, "base64").toString("utf8");
}

function signPayload(payload) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");
}

function createAdminToken() {
  const payload = JSON.stringify({
    email: getAdminEmail(),
    exp: Date.now() + SESSION_TTL_MS
  });
  const encodedPayload = base64UrlEncode(payload);
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function extractAdminToken(req) {
  const authHeader = String(req.headers.authorization || "").trim();

  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return String(req.headers["x-admin-token"] || "").trim();
}

function verifyAdminToken(token) {
  const parts = String(token || "").split(".");

  if (parts.length !== 2) {
    return null;
  }

  const encodedPayload = parts[0];
  const providedSignature = parts[1];
  const expectedSignature = signPayload(encodedPayload);

  if (
    providedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    if (!payload || payload.email !== getAdminEmail() || Number(payload.exp || 0) < Date.now()) {
      return null;
    }

    return payload;
  } catch (_error) {
    return null;
  }
}

function isAdminAuthenticated(req) {
  return Boolean(verifyAdminToken(extractAdminToken(req)));
}

function verifyAdminCredentials(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");

  return normalizedEmail === getAdminEmail() && normalizedPassword === getAdminPassword();
}

function requireAdmin(req, res, next) {
  const token = extractAdminToken(req);
  const payload = verifyAdminToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Admin authentication required." });
  }

  req.admin = payload;
  next();
}

module.exports = {
  getAdminEmail,
  createAdminToken,
  verifyAdminCredentials,
  requireAdmin,
  isAdminAuthenticated
};
