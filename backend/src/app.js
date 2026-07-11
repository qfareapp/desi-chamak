const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const orderRoutes = require("./routes/orders.routes");
const productRoutes = require("./routes/products.routes");
const contentRoutes = require("./routes/content.routes");
const uploadRoutes = require("./routes/uploads.routes");

const app = express();

app.use(
  cors({
    origin: true
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Desi Chamak backend is running",
    docs: {
      health: "/api/health",
      auth: "/api/auth",
      orders: "/api/orders",
      products: "/api/products",
      sections: "/api/content-sections"
    }
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/content-sections", contentRoutes);
app.use("/api/uploads", uploadRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;

  res.status(status).json({
    error: err.message || "Internal server error"
  });
});

module.exports = app;
