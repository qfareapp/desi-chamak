const express = require("express");

const Customer = require("../models/Customer");
const Order = require("../models/Order");
const { serializeCustomer } = require("../utils/auth");
const { requireAdmin } = require("../utils/adminAuth");

const router = express.Router();

router.get("/", requireAdmin, async (_req, res, next) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 }).lean();
    const customerIds = customers.map((customer) => customer._id);
    const orderSummary = await Order.aggregate([
      {
        $match: {
          customerId: { $in: customerIds }
        }
      },
      {
        $group: {
          _id: "$customerId",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$total" },
          latestOrderAt: { $max: "$createdAt" }
        }
      }
    ]);
    const summaryByCustomerId = orderSummary.reduce((accumulator, item) => {
      accumulator[String(item._id)] = item;
      return accumulator;
    }, {});

    res.json(
      customers.map((customer) => {
        const summary = summaryByCustomerId[String(customer._id)] || {};

        return {
          ...serializeCustomer(customer),
          totalOrders: Number(summary.totalOrders || 0),
          totalSpent: Number(summary.totalSpent || 0),
          latestOrderAt: summary.latestOrderAt || null
        };
      })
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
