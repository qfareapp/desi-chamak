const express = require("express");

const Order = require("../models/Order");

const router = express.Router();

function toReference(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
}

function normalizePayload(body) {
  const items = Array.isArray(body.items)
    ? body.items.map((item) => ({
        id: String(item.id || "").trim(),
        slug: String(item.slug || "").trim(),
        name: String(item.name || "").trim(),
        image: String(item.image || "").trim(),
        price: Number(item.price || 0),
        quantity: Math.max(1, Number(item.quantity || 1)),
        link: String(item.link || "").trim()
      }))
    : [];

  const subtotal =
    Number(body.subtotal || 0) ||
    items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Number(body.total || subtotal) || subtotal;
  const billing = body.billing || {};
  const customerName =
    String(body.customerName || "").trim() ||
    [billing.firstName, billing.lastName].filter(Boolean).join(" ").trim();

  return {
    reference: toReference(body.reference || body.id || `DC-${Date.now()}`),
    customerName,
    billing: {
      firstName: String(billing.firstName || "").trim(),
      lastName: String(billing.lastName || "").trim(),
      country: String(billing.country || "").trim(),
      addressLine1: String(billing.addressLine1 || "").trim(),
      addressLine2: String(billing.addressLine2 || "").trim(),
      city: String(billing.city || "").trim(),
      state: String(billing.state || "").trim(),
      postcode: String(billing.postcode || "").trim(),
      phone: String(billing.phone || "").trim(),
      email: String(billing.email || "").trim(),
      notes: String(billing.notes || "").trim()
    },
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    total,
    paymentFlow: String(body.paymentFlow || "confirm-before-payment").trim(),
    orderStatus: String(body.orderStatus || "new").trim().toLowerCase(),
    paymentStatus: String(body.paymentStatus || "pending").trim().toLowerCase(),
    fulfillmentStatus: String(body.fulfillmentStatus || "unfulfilled").trim().toLowerCase()
  };
}

function mapOrder(order) {
  return {
    id: order.reference,
    reference: order.reference,
    customerName: order.customerName,
    billing: order.billing,
    items: order.items,
    itemCount: order.itemCount,
    subtotal: order.subtotal,
    total: order.total,
    paymentFlow: order.paymentFlow,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

router.get("/", async (_req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders.map(mapOrder));
  } catch (error) {
    next(error);
  }
});

router.get("/:reference", async (req, res, next) => {
  try {
    const order = await Order.findOne({ reference: toReference(req.params.reference) });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(mapOrder(order));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = normalizePayload(req.body);
    const order = await Order.create(payload);
    res.status(201).json(mapOrder(order));
  } catch (error) {
    next(error);
  }
});

router.put("/:reference", async (req, res, next) => {
  try {
    const payload = normalizePayload({
      ...req.body,
      reference: req.params.reference
    });
    const order = await Order.findOneAndUpdate(
      { reference: toReference(req.params.reference) },
      payload,
      {
        new: true,
        runValidators: true
      }
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(mapOrder(order));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
