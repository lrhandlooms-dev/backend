const express = require("express");

const upload = require("../middleware/uploadMiddleware");

const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,

  uploadProductImages,
  setMainProductImage,
  deleteProductImage,
  reorderProductImages,

  uploadMakingStepImage,
  addMakingStep,
  updateMakingStep,
  deleteMakingStep,
} = require("../controllers/productController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// PRODUCT IMAGE UPLOAD
// ==========================================

router.post(
  "/upload-images",
  protect,
  upload.array("images", 10),
  uploadProductImages
);


// ==========================================
// MAKING STEP IMAGE UPLOAD
// ==========================================

router.post(
  "/upload-making-step-image",
  protect,
  upload.single("image"),
  uploadMakingStepImage
);


// ==========================================
// PUBLIC PRODUCT ROUTES
// ==========================================

router.get("/", getProducts);

router.get("/:id", getProduct);


// ==========================================
// ADMIN PRODUCT ROUTES
// ==========================================

router.post(
  "/",
  protect,
  createProduct
);

router.put(
  "/:id",
  protect,
  updateProduct
);

router.delete(
  "/:id",
  protect,
  deleteProduct
);


// ==========================================
// PRODUCT IMAGE MANAGEMENT
// ==========================================

// Set main image
router.put(
  "/:id/images/main",
  protect,
  setMainProductImage
);


// Delete individual image
router.delete(
  "/:id/images/:imageId",
  protect,
  deleteProductImage
);


// Reorder images
router.put(
  "/:id/images/reorder",
  protect,
  reorderProductImages
);


// ==========================================
// MAKING STEP ROUTES
// ==========================================

router.post(
  "/:id/making-steps",
  protect,
  addMakingStep
);

router.put(
  "/:id/making-steps/:stepId",
  protect,
  updateMakingStep
);

router.delete(
  "/:id/making-steps/:stepId",
  protect,
  deleteMakingStep
);


module.exports = router;