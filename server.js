const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const adminRoutes = require("./routes/adminRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const imageRoutes = require("./routes/imageRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");


const app = express();

app.use(cors({
  origin: [
    "https://admin.lrhandlooms.in",
    "https://lrhandlooms.in",
    "https://www.lrhandlooms.in",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());
app.use(express.json());


connectDB();

app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);


app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Handloom API is running",
  });
});

// ==========================================================
// WEBSITE CHANGE VERSION
// ==========================================================

const {
  getWebsiteVersion,
} = require("./utils/websiteVersion");

app.get("/api/website/version", (req, res) => {

  res.set("Cache-Control", "no-store");

  res.json({
    success: true,
    version: getWebsiteVersion(),
  });

});

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});