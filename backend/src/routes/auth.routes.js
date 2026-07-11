const express = require("express");

const Customer = require("../models/Customer");
const {
  normalizeEmail,
  createPasswordRecord,
  verifyPassword,
  createSessionToken,
  findCustomerFromRequest,
  serializeCustomer
} = require("../utils/auth");

const router = express.Router();

function normalizePayload(body) {
  return {
    firstName: String(body.firstName || "").trim(),
    lastName: String(body.lastName || "").trim(),
    email: normalizeEmail(body.email),
    phone: String(body.phone || "").trim(),
    password: String(body.password || "")
  };
}

function validatePayload(payload) {
  if (!payload.firstName || !payload.lastName) {
    return "First name and last name are required.";
  }

  if (!payload.email) {
    return "Email is required.";
  }

  if (!payload.password || payload.password.length < 6) {
    return "Password must be at least 6 characters long.";
  }

  return "";
}

function buildAuthResponse(customer) {
  return {
    token: customer.sessionToken,
    customer: serializeCustomer(customer)
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const payload = normalizePayload(req.body);
    const validationError = validatePayload(payload);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const existingCustomer = await Customer.findOne({ email: payload.email });

    if (existingCustomer) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordRecord = createPasswordRecord(payload.password);
    const customer = await Customer.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      sessionToken: createSessionToken(),
      ...passwordRecord
    });

    res.status(201).json(buildAuthResponse(customer));
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const customer = await Customer.findOne({ email });

    if (!customer || !verifyPassword(password, customer)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    customer.sessionToken = createSessionToken();
    await customer.save();

    res.json(buildAuthResponse(customer));
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    const customer = await findCustomerFromRequest(req);

    if (!customer) {
      return res.status(401).json({ error: "Authentication required." });
    }

    res.json(serializeCustomer(customer));
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const customer = await findCustomerFromRequest(req);

    if (customer) {
      customer.sessionToken = "";
      await customer.save();
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
