const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    mongoState: mongoose.connection.readyState
  });
});

module.exports = router;
