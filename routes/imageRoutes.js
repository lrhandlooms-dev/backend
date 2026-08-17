const express = require("express");

const upload =
  require("../middleware/uploadMiddleware");

const protect =
  require("../middleware/authMiddleware");

const {
  getImages,
  uploadImage,
  deleteImage,
} = require("../controllers/imageController");

const router =
  express.Router();


// GET ALL / FILTERED IMAGES
router.get(
  "/",
  protect,
  getImages
);


// UPLOAD IMAGE
router.post(
  "/upload",
  protect,
  upload.single("image"),
  uploadImage
);


// DELETE IMAGE
router.delete(
  "/",
  protect,
  deleteImage
);


module.exports = router;