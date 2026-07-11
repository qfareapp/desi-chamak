const crypto = require("crypto");

const Customer = require("../models/Customer");

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
}

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  return {
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt)
  };
}

function verifyPassword(password, customer) {
  if (!customer || !customer.passwordSalt || !customer.passwordHash) {
    return false;
  }

  return hashPassword(password, customer.passwordSalt) === customer.passwordHash;
}

function createSessionToken() {
  return crypto.randomBytes(24).toString("hex");
}

function extractToken(req) {
  const authHeader = String(req.headers.authorization || "").trim();

  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return String(req.headers["x-auth-token"] || "").trim();
}

async function findCustomerFromRequest(req) {
  const token = extractToken(req);

  if (!token) {
    return null;
  }

  return Customer.findOne({ sessionToken: token });
}

function serializeCustomer(customer) {
  return {
    id: String(customer._id),
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone || "",
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt
  };
}

module.exports = {
  normalizeEmail,
  createPasswordRecord,
  verifyPassword,
  createSessionToken,
  extractToken,
  findCustomerFromRequest,
  serializeCustomer
};
