const Category = require("../models/Category");
const cloudinary = require("../config/cloudinary");
const sharp = require("sharp");

const {
  bumpWebsiteVersion,
} = require("../utils/websiteVersion");

// Create Category
const createCategory = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      image,
      imagePublicId,
      sortOrder,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Name and slug are required",
      });
    }

    const existingCategory = await Category.findOne({
      $or: [{ name }, { slug }],
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await Category.create({
      name,
      slug,
      description,
      image,
      imagePublicId,
      sortOrder,
    });

    bumpWebsiteVersion();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create category error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get All Categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({
      sortOrder: 1,
      createdAt: -1,
    });

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get Single Category
const getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Update Category
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const {
      name,
      slug,
      description,
      image,
      imagePublicId,
      isActive,
      sortOrder,
    } = req.body;

    // If a new image is provided
    if (
      imagePublicId &&
      imagePublicId !== category.imagePublicId
    ) {
      // Delete old image from Cloudinary
      if (category.imagePublicId) {
        try {
          await cloudinary.uploader.destroy(
            category.imagePublicId
          );
        } catch (error) {
          console.error(
            "Old Cloudinary image delete error:",
            error.message
          );
        }
      }

      category.image = image || "";
      category.imagePublicId = imagePublicId;
    }

    if (name !== undefined) category.name = name;
    if (slug !== undefined) category.slug = slug;
    if (description !== undefined)
      category.description = description;
    if (isActive !== undefined)
      category.isActive = isActive;
    if (sortOrder !== undefined)
      category.sortOrder = sortOrder;

    await category.save();

    bumpWebsiteVersion();

    res.json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Update category error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Delete Category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Delete image from Cloudinary
    if (category.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(category.imagePublicId);
      } catch (cloudinaryError) {
        console.error(
          "Cloudinary delete error:",
          cloudinaryError.message
        );
      }
    }

    // Delete category from MongoDB
    await Category.findByIdAndDelete(req.params.id);

    bumpWebsiteVersion();

    res.json({
      success: true,
      message: "Category and image deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const uploadCategoryImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image",
      });
    }

    console.log("CATEGORY IMAGE:");
    console.log("Original size:", req.file.size);
    console.log("Original type:", req.file.mimetype);

    // ==========================================
    // OPTIMIZE IMAGE BEFORE CLOUDINARY
    // ==========================================

    const optimizedBuffer = await sharp(req.file.buffer)
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 82,
        progressive: true,
        mozjpeg: true,
      })
      .toBuffer();

    console.log(
      "Optimized size:",
      optimizedBuffer.length
    );

    // ==========================================
    // UPLOAD TO CLOUDINARY
    // ==========================================

    const uploadResult = await new Promise(
      (resolve, reject) => {

        const stream =
          cloudinary.uploader.upload_stream(
            {
              folder: "handloom/categories",
              resource_type: "image",
            },
            (error, result) => {

              if (error) {
                console.error(
                  "CLOUDINARY CATEGORY ERROR:",
                  error
                );

                reject(error);

              } else {

                resolve(result);

              }
            }
          );

        stream.end(optimizedBuffer);
      }
    );

    // ==========================================
    // SUCCESS
    // ==========================================

    console.log(
      "Category image uploaded:",
      uploadResult.secure_url
    );

    // bumpWebsiteVersion();

    res.status(200).json({
      success: true,
      message:
        "Category image uploaded successfully",

      image:
        uploadResult.secure_url,

      publicId:
        uploadResult.public_id,
    });

  } catch (error) {

    console.error(
      "CATEGORY IMAGE UPLOAD ERROR:"
    );

    console.error(error);

    res.status(500).json({
      success: false,

      message:
        error.message ||
        "Image upload failed",
    });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
};