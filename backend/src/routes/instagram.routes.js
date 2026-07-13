const express = require("express");

const ContentSection = require("../models/ContentSection");
const { requireAdmin } = require("../utils/adminAuth");

const router = express.Router();

const SECTION_KEY = "instagram-feed";
const GRAPH_BASE = "https://graph.facebook.com/v24.0";

const defaults = {
  enabled: true,
  heading: "Follow Us On Instagram",
  username: "aaraa_silver",
  profileUrl: "https://www.instagram.com/aaraa_silver/",
  igUserId: "",
  accessToken: "",
  limit: 6,
  items: [
    { image: "img/instagram/insta-1.jpg", permalink: "https://www.instagram.com/aaraa_silver/" },
    { image: "img/instagram/insta-2.jpg", permalink: "https://www.instagram.com/aaraa_silver/" },
    { image: "img/instagram/insta-3.jpg", permalink: "https://www.instagram.com/aaraa_silver/" },
    { image: "img/instagram/insta-4.jpg", permalink: "https://www.instagram.com/aaraa_silver/" },
    { image: "img/instagram/insta-5.jpg", permalink: "https://www.instagram.com/aaraa_silver/" },
    { image: "img/instagram/insta-6.jpg", permalink: "https://www.instagram.com/aaraa_silver/" }
  ]
};

function normalizePayload(payload) {
  const source = payload || {};
  const fallbackProfile = source.profileUrl || defaults.profileUrl;

  return {
    enabled: source.enabled !== false,
    heading: String(source.heading || defaults.heading).trim(),
    username: String(source.username || defaults.username).replace(/^@+/, "").trim(),
    profileUrl: String(fallbackProfile).trim(),
    igUserId: String(source.igUserId || "").trim(),
    accessToken: String(source.accessToken || "").trim(),
    limit: Math.max(1, Math.min(12, Number(source.limit || defaults.limit) || defaults.limit)),
    items: Array.isArray(source.items)
      ? source.items.map((item) => ({
          image: String((item && item.image) || "").trim(),
          permalink: String((item && item.permalink) || fallbackProfile).trim()
        })).filter((item) => item.image)
      : defaults.items.slice()
  };
}

function publicPayload(payload) {
  return {
    enabled: payload.enabled,
    heading: payload.heading,
    username: payload.username,
    profileUrl: payload.profileUrl,
    igUserId: payload.igUserId,
    limit: payload.limit,
    items: payload.items
  };
}

async function readSection() {
  const section = await ContentSection.findOne({ key: SECTION_KEY });

  if (!section) {
    return normalizePayload(defaults);
  }

  return normalizePayload(section.payload);
}

async function fetchInstagramMedia(payload) {
  if (!payload.igUserId || !payload.accessToken) {
    return payload.items.slice(0, payload.limit);
  }

  const params = new URLSearchParams({
    fields: "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username",
    limit: String(payload.limit),
    access_token: payload.accessToken
  });
  const response = await fetch(`${GRAPH_BASE}/${encodeURIComponent(payload.igUserId)}/media?${params.toString()}`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((body && body.error && body.error.message) || "Unable to load Instagram media.");
  }

  const items = Array.isArray(body.data) ? body.data : [];

  return items.map((item) => ({
    id: String(item.id || "").trim(),
    image: String(item.media_type === "VIDEO" ? (item.thumbnail_url || item.media_url || "") : (item.media_url || item.thumbnail_url || "")).trim(),
    permalink: String(item.permalink || payload.profileUrl).trim(),
    caption: String(item.caption || "").trim(),
    mediaType: String(item.media_type || "").trim(),
    timestamp: item.timestamp || "",
    username: String(item.username || payload.username).replace(/^@+/, "").trim()
  })).filter((item) => item.image);
}

router.get("/", async (_req, res, next) => {
  try {
    const payload = await readSection();
    const items = await fetchInstagramMedia(payload).catch(() => payload.items.slice(0, payload.limit));

    res.json({
      ...publicPayload(payload),
      items
    });
  } catch (error) {
    next(error);
  }
});

router.get("/admin", requireAdmin, async (_req, res, next) => {
  try {
    res.json(await readSection());
  } catch (error) {
    next(error);
  }
});

router.get("/preview", requireAdmin, async (_req, res, next) => {
  try {
    const payload = await readSection();
    const items = await fetchInstagramMedia(payload);

    res.json({
      ...publicPayload(payload),
      items
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
