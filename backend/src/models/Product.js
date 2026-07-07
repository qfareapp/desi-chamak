const mongoose = require("mongoose");

const priceSchema = new mongoose.Schema(
  {
    cost: {
      type: Number,
      min: 0,
      default: null
    },
    selling: {
      type: Number,
      required: true,
      min: 0
    },
    compareAt: {
      type: Number,
      min: 0,
      default: null
    }
  },
  { _id: false }
);

const mediaSchema = new mongoose.Schema(
  {
    heroImage: {
      type: String,
      trim: true
    },
    gallery: {
      type: [String],
      default: []
    },
    thumbnails: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const widgetSchema = new mongoose.Schema(
  {
    availability: String,
    finish: String,
    dimensions: String,
    inBox: String,
    promotionLine: String
  },
  { _id: false }
);

const tabsSchema = new mongoose.Schema(
  {
    description: String,
    specification: String,
    reviewSnippet: String
  },
  { _id: false }
);

const relatedProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    image: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      min: 0
    },
    badge: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      uppercase: true
    },
    subtitle: {
      type: String,
      trim: true,
      default: ""
    },
    category: {
      type: String,
      trim: true,
      default: ""
    },
    summary: {
      type: String,
      trim: true,
      default: ""
    },
    price: {
      type: priceSchema,
      required: true
    },
    reviewCount: {
      type: Number,
      min: 0,
      default: 0
    },
    stockQty: {
      type: Number,
      min: 0,
      default: 0
    },
    status: {
      type: String,
      enum: ["draft", "live", "archived", "sold-out"],
      default: "live"
    },
    badge: {
      type: String,
      trim: true,
      default: ""
    },
    dispatchSla: {
      type: String,
      trim: true,
      default: ""
    },
    media: {
      type: mediaSchema,
      default: () => ({})
    },
    widget: {
      type: widgetSchema,
      default: () => ({})
    },
    tabs: {
      type: tabsSchema,
      default: () => ({})
    },
    relatedProducts: {
      type: [relatedProductSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Product", productSchema);
