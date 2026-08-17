const express = require("express");

const {
  createInventory,
  getInventory,
  getProductInventory,
  updateStock,
  addStock,
  removeStock,
} = require("../controllers/inventoryController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createInventory);

router.get("/", protect, getInventory);

router.get(
  "/product/:productId",
  protect,
  getProductInventory
);

router.put(
  "/product/:productId",
  protect,
  updateStock
);

router.post(
  "/product/:productId/add",
  protect,
  addStock
);

router.post(
  "/product/:productId/remove",
  protect,
  removeStock
);

module.exports = router;