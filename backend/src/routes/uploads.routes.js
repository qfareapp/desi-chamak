const express = require("express");
const multer = require("multer");

const { getCloudinaryClient } = require("../config/cloudinary");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

function uploadToCloudinary(fileBuffer, options) {
  const cloudinary = getCloudinaryClient();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });

    stream.end(fileBuffer);
  });
}

router.post("/image", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Select an image file to upload." });
    }

    if (!req.file.mimetype || !req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Only image uploads are supported." });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: process.env.CLOUDINARY_UPLOAD_FOLDER || "aaraa",
      resource_type: "image"
    });

    res.status(201).json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      originalFilename: req.file.originalname
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
