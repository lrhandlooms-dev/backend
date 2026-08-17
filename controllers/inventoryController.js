const Inventory = require("../models/Inventory");
const Product = require("../models/Product");

const {
  bumpWebsiteVersion,
} = require("../utils/websiteVersion");

// ==========================================
// HELPER — STOCK STATUS
// ==========================================

const getStockStatus = (stock, lowStockThreshold) => {
  const currentStock = Number(stock) || 0;
  const threshold = Number(lowStockThreshold) || 0;

  if (currentStock === 0) {
    return "OUT_OF_STOCK";
  }

  if (currentStock <= threshold) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
};

// ==========================================
// CREATE / INITIALIZE INVENTORY
// ==========================================

const createInventory = async (req, res) => {
  try {
    const { product, stock, lowStockThreshold } = req.body;

    if (!product) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (Number(stock) < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock cannot be negative",
      });
    }

    const productExists = await Product.findById(product);

    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const existingInventory = await Inventory.findOne({ product });

    if (existingInventory) {
      return res.status(400).json({
        success: false,
        message: "Inventory already exists for this product",
      });
    }

    const inventory = await Inventory.create({
      product,
      stock: stock || 0,
      lowStockThreshold:
        lowStockThreshold !== undefined
          ? lowStockThreshold
          : 3,
      lastUpdatedBy: req.admin.id,
    });

    // Keep Product stock synchronized
    productExists.stock = inventory.stock;
    await productExists.save();

    bumpWebsiteVersion();

    const status = getStockStatus(
      inventory.stock,
      inventory.lowStockThreshold
    );

    res.status(201).json({
      success: true,
      message: "Inventory created successfully",
      inventory,
      status,
    });
  } catch (error) {
    console.error("Create inventory error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// GET ALL INVENTORY
// ==========================================

const getInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find()
  .populate(
    "product",
    "name slug price images stock category"
  )
  .populate(
    {
      path: "product",
      populate: {
        path: "category",
        select: "name slug"
      }
    }
  )
  .sort({ updatedAt: -1 });

    const inventoryWithStatus = inventory.map((item) => ({
      ...item.toObject(),
      status: getStockStatus(
        item.stock,
        item.lowStockThreshold
      ),
    }));

    res.json({
      success: true,
      inventory: inventoryWithStatus,
    });
  } catch (error) {
    console.error("Get inventory error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// GET SINGLE PRODUCT INVENTORY
// ==========================================

const getProductInventory = async (req, res) => {
  try {
    const inventory = await Inventory.findOne({
      product: req.params.productId,
    }).populate("product", "name slug price images stock");

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    const status = getStockStatus(
      inventory.stock,
      inventory.lowStockThreshold
    );

    res.json({
      success: true,
      inventory,
      status,
    });
  } catch (error) {
    console.error("Get product inventory error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// UPDATE STOCK
// ==========================================

const updateStock = async (req, res) => {
  try {
    const { stock } = req.body;

    if (stock === undefined) {
      return res.status(400).json({
        success: false,
        message: "Stock value is required",
      });
    }

    if (Number(stock) < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock cannot be negative",
      });
    }

    const inventory = await Inventory.findOne({
      product: req.params.productId,
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    inventory.stock = Number(stock);
    inventory.lastUpdatedBy = req.admin.id;

    await inventory.save();

    // Keep Product stock synchronized
    await Product.findByIdAndUpdate(
      req.params.productId,
      {
        stock: Number(stock),
      }
    );

    bumpWebsiteVersion();

    const status = getStockStatus(
      inventory.stock,
      inventory.lowStockThreshold
    );

    res.json({
      success: true,
      message: "Stock updated successfully",
      inventory,
      status,
    });
  } catch (error) {
    console.error("Update stock error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// ADD STOCK
// ==========================================

const addStock = async (req, res) => {
  try {
    const { quantity } = req.body;

    if (!quantity || Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    const inventory = await Inventory.findOne({
      product: req.params.productId,
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    inventory.stock += Number(quantity);
    inventory.lastUpdatedBy = req.admin.id;

    await inventory.save();

    // Keep Product stock synchronized
    await Product.findByIdAndUpdate(
      req.params.productId,
      {
        stock: inventory.stock,
      }
    );

    bumpWebsiteVersion();

    const status = getStockStatus(
      inventory.stock,
      inventory.lowStockThreshold
    );

    res.json({
      success: true,
      message: "Stock added successfully",
      inventory,
      status,
    });
  } catch (error) {
    console.error("Add stock error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// REMOVE STOCK
// ==========================================

const removeStock = async (req, res) => {
  try {
    const { quantity } = req.body;

    if (!quantity || Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    const inventory = await Inventory.findOne({
      product: req.params.productId,
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found",
      });
    }

    if (inventory.stock < Number(quantity)) {
      return res.status(400).json({
        success: false,
        message: "Not enough stock available",
      });
    }

    inventory.stock -= Number(quantity);
    inventory.lastUpdatedBy = req.admin.id;

    await inventory.save();

    // Keep Product stock synchronized
    await Product.findByIdAndUpdate(
      req.params.productId,
      {
        stock: inventory.stock,
      }
    );

    bumpWebsiteVersion();

    const status = getStockStatus(
      inventory.stock,
      inventory.lowStockThreshold
    );

    res.json({
      success: true,
      message: "Stock removed successfully",
      inventory,
      status,
    });
  } catch (error) {
    console.error("Remove stock error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  createInventory,
  getInventory,
  getProductInventory,
  updateStock,
  addStock,
  removeStock,
};