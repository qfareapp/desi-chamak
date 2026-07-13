const express = require("express");

const ContentSection = require("../models/ContentSection");
const { requireAdmin } = require("../utils/adminAuth");

const router = express.Router();

function sanitizeSection(section) {
  if (!section) {
    return section;
  }

  const data = typeof section.toObject === "function" ? section.toObject() : { ...section };

  if (data.key === "instagram-feed" && data.payload) {
    data.payload = {
      ...data.payload
    };
    delete data.payload.accessToken;
  }

  return data;
}

router.get("/", async (_req, res, next) => {
  try {
    const sections = await ContentSection.find().sort({ key: 1 });
    res.json(sections.map(sanitizeSection));
  } catch (error) {
    next(error);
  }
});

router.get("/:key", async (req, res, next) => {
  try {
    const section = await ContentSection.findOne({ key: req.params.key.toLowerCase() });

    if (!section) {
      return res.status(404).json({ error: "Content section not found" });
    }

    res.json(sanitizeSection(section));
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const section = await ContentSection.create(req.body);
    res.status(201).json(section);
  } catch (error) {
    next(error);
  }
});

router.put("/:key", requireAdmin, async (req, res, next) => {
  try {
    const key = req.params.key.toLowerCase();
    const section = await ContentSection.findOneAndUpdate(
      { key },
      {
        ...req.body,
        key
      },
      {
        new: true,
        runValidators: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    res.json(section);
  } catch (error) {
    next(error);
  }
});

router.delete("/:key", requireAdmin, async (req, res, next) => {
  try {
    const section = await ContentSection.findOneAndDelete({
      key: req.params.key.toLowerCase()
    });

    if (!section) {
      return res.status(404).json({ error: "Content section not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
