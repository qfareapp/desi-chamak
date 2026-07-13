const express = require("express");

const {
  getAdminEmail,
  createAdminToken,
  verifyAdminCredentials,
  requireAdmin
} = require("../utils/adminAuth");

const router = express.Router();

router.post("/login", (req, res) => {
  const email = String(req.body.email || "").trim();
  const password = String(req.body.password || "");

  if (!verifyAdminCredentials(email, password)) {
    return res.status(401).json({ error: "Invalid admin email or password." });
  }

  res.json({
    token: createAdminToken(),
    admin: {
      email: getAdminEmail()
    }
  });
});

router.get("/me", requireAdmin, (req, res) => {
  res.json({
    email: req.admin.email
  });
});

module.exports = router;
