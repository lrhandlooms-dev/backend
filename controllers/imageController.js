const cloudinary = require("../config/cloudinary");

const FOLDERS = {
  products: "handloom/products",
  categories: "handloom/categories",
  "making-steps": "handloom/making-steps",
};

// ==========================================
// GET IMAGES
// ==========================================

const getImages = async (req, res) => {
  try {
    const type = req.query.type || "all";
    const search = (req.query.search || "").trim();

    let folders = [];

    if (type === "all") {
      folders = Object.values(FOLDERS);
    } else if (FOLDERS[type]) {
      folders = [FOLDERS[type]];
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid image type",
      });
    }

    const results = [];

    for (const folder of folders) {
      try {
        const expression = `folder:${folder}/*`;

        const data =
          await cloudinary.api.resources({
            type: "upload",
            prefix: folder,
            max_results: 500,
            context: true,
            tags: true,
            resource_type: "image",
          });

        const resources = data.resources || [];

        resources.forEach((image) => {
          const publicId = image.public_id || "";

          if (
            search &&
            !publicId
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            !image.secure_url
              ?.toLowerCase()
              .includes(search.toLowerCase())
          ) {
            return;
          }

          results.push({
            publicId,
            url: image.secure_url,
            width: image.width,
            height: image.height,
            format: image.format,
            bytes: image.bytes,
            createdAt: image.created_at,
            folder,
            type:
              folder === FOLDERS.products
                ? "products"
                : folder === FOLDERS.categories
                ? "categories"
                : "making-steps",
          });
        });
      } catch (folderError) {
        console.error(
          `Cloudinary folder error: ${folder}`,
          folderError.message
        );
      }
    }

    results.sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    );

    res.json({
      success: true,
      count: results.length,
      images: results,
    });
  } catch (error) {
    console.error(
      "Get images error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to load images",
    });
  }
};


// ==========================================
// DELETE IMAGE
// ==========================================

const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "Public ID is required",
      });
    }

    const result =
      await cloudinary.uploader.destroy(
        publicId,
        {
          resource_type: "image",
        }
      );

    if (result.result !== "ok") {
      return res.status(400).json({
        success: false,
        message:
          "Image could not be deleted",
        result: result.result,
      });
    }

    res.json({
      success: true,
      message: "Image deleted successfully",
      publicId,
    });
  } catch (error) {
    console.error(
      "Delete image error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to delete image",
    });
  }
};


// ==========================================
// UPLOAD IMAGE
// ==========================================

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image",
      });
    }

    const type =
      req.body.type || "products";

    const folder =
      FOLDERS[type];

    if (!folder) {
      return res.status(400).json({
        success: false,
        message: "Invalid image type",
      });
    }

    const result =
      await new Promise(
        (resolve, reject) => {
          const stream =
            cloudinary.uploader.upload_stream(
              {
                folder,
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  resolve(result);
                }
              }
            );

          stream.end(
            req.file.buffer
          );
        }
      );

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      image: {
        publicId:
          result.public_id,
        url:
          result.secure_url,
        width:
          result.width,
        height:
          result.height,
        format:
          result.format,
        bytes:
          result.bytes,
        folder,
        type,
      },
    });
  } catch (error) {
    console.error(
      "Upload image error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Image upload failed",
    });
  }
};


module.exports = {
  getImages,
  uploadImage,
  deleteImage,
};