const mongoose = require("mongoose");
const Product = require("../models/Product");
const {
  bumpWebsiteVersion,
} = require("../utils/websiteVersion");
const Category = require("../models/Category");
const cloudinary = require("../config/cloudinary");
const sharp = require("sharp");
const Inventory = require("../models/Inventory");

// ==========================================
// HELPER — OPTIMIZED CLOUDINARY IMAGE URL
// ==========================================

const getOptimizedImageUrl = (publicId) => {
    return cloudinary.url(publicId, {
        secure: true,
        transformation: [
            {
                width: 1600,
                height: 1600,
                crop: "limit",
                quality: "auto",
                fetch_format: "auto",
            },
        ],
    });
};

// ==========================================
// HELPER — CALCULATE PRODUCT PRICE
// ==========================================

const calculateProductPrice = (product) => {
    const originalPrice = Number(product.price) || 0;

    if (
        !product.offer ||
        !product.offer.enabled ||
        !product.offer.value
    ) {
        return {
            originalPrice,
            finalPrice: originalPrice,
            discountAmount: 0,
            discountPercentage: 0,
            offerActive: false,
        };
    }

    const now = new Date();

    // Offer has not started
    if (
        product.offer.startDate &&
        now < new Date(product.offer.startDate)
    ) {
        return {
            originalPrice,
            finalPrice: originalPrice,
            discountAmount: 0,
            discountPercentage: 0,
            offerActive: false,
        };
    }

    // Offer expired
    if (
        product.offer.endDate &&
        now > new Date(product.offer.endDate)
    ) {
        return {
            originalPrice,
            finalPrice: originalPrice,
            discountAmount: 0,
            discountPercentage: 0,
            offerActive: false,
        };
    }

    let discountAmount = 0;

    if (product.offer.type === "percentage") {
        discountAmount =
            (originalPrice * Number(product.offer.value)) / 100;
    }

    if (product.offer.type === "fixed") {
        discountAmount = Number(product.offer.value);
    }

    // Never allow price below zero
    discountAmount = Math.min(
        Math.max(discountAmount, 0),
        originalPrice
    );

    const finalPrice = originalPrice - discountAmount;

    const discountPercentage =
        originalPrice > 0
            ? Number(((discountAmount / originalPrice) * 100).toFixed(2))
            : 0;

    return {
        originalPrice,
        finalPrice,
        discountAmount,
        discountPercentage,
        offerActive: true,
    };
};

// ==========================================
// CREATE PRODUCT
// ==========================================

const createProduct = async (req, res) => {
    try {
        const {
            name,
            slug,
            description,
            category,
            price,
            offer,
            stock,
            images,
            fabric,
            colors,
            length,
            catalog,
            featured,
            isActive,
        } = req.body;

        if (!name || !slug || !category || price === undefined) {
            return res.status(400).json({
                success: false,
                message: "Name, slug, category and price are required",
            });
        }

        if (Number(price) < 0) {
            return res.status(400).json({
                success: false,
                message: "Price cannot be negative",
            });
        }

        const categoryExists = await Category.findById(category);

        if (!categoryExists) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        const existingProduct = await Product.findOne({ slug });

        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: "Product with this slug already exists",
            });
        }

        const product = await Product.create({
            name,
            slug,
            description,
            category,
            price,
            offer,
            stock,
            images,
            fabric,
            colors,
            length,
            catalog,
            featured,
            isActive,
        });

        // ==========================================
        // CREATE INVENTORY FOR NEW PRODUCT
        // ==========================================

        const inventory = await Inventory.create({
            product: product._id,
            stock: Number(stock) || 0,
            lowStockThreshold: 3,
            lastUpdatedBy: req.admin?.id || null,
        });

        bumpWebsiteVersion();

        const pricing = calculateProductPrice(product);

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product,
            pricing,
        });
    } catch (error) {
        console.error("Create product error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ==========================================
// GET ALL PRODUCTS
// ==========================================
//
// Supported:
// ?search=sambalpuri
// ?category=CATEGORY_ID
// ?minPrice=2000
// ?maxPrice=5000
// ?fabric=Cotton
// ?color=Red
// ?offer=true
// ?featured=true
// ?inStock=true
// ?sort=newest
// ?sort=oldest
// ?sort=price_asc
// ?sort=price_desc
// ?sort=name_asc
// ?page=1
// ?limit=12
//
// Example:
// /api/products?search=sambalpuri&minPrice=2000&maxPrice=5000&sort=price_asc
// ==========================================

const getProducts = async (req, res) => {
    try {
        const {
            search,
            category,
            minPrice,
            maxPrice,
            fabric,
            color,
            offer,
            featured,
            inStock,
            sort = "newest",
            page = 1,
            limit = 12,
        } = req.query;

        // ==========================================
        // BUILD FILTER
        // ==========================================

        const filter = {};

        // ------------------------------------------
        // SEARCH
        // ------------------------------------------

        if (search && search.trim()) {
            const searchRegex = new RegExp(
                search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "i"
            );

            filter.$or = [
                { name: searchRegex },
                { slug: searchRegex },
                { description: searchRegex },
                { fabric: searchRegex },
                { colors: searchRegex },
                { "catalog.materialsUsed": searchRegex },
                { "catalog.weavingTechnique": searchRegex },
                { "catalog.makingProcess": searchRegex },
                { "catalog.origin": searchRegex },
                { "catalog.artisanInformation": searchRegex },
            ];
        }

        // ------------------------------------------
        // CATEGORY
        // ------------------------------------------

        if (category) {
            if (!mongoose.Types.ObjectId.isValid(category)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid category ID",
                });
            }

            filter.category = category;
        }

        // ------------------------------------------
        // PRICE
        // ------------------------------------------

        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.price = {};

            if (minPrice !== undefined) {
                const minimum = Number(minPrice);

                if (Number.isNaN(minimum) || minimum < 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid minimum price",
                    });
                }

                filter.price.$gte = minimum;
            }

            if (maxPrice !== undefined) {
                const maximum = Number(maxPrice);

                if (Number.isNaN(maximum) || maximum < 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid maximum price",
                    });
                }

                filter.price.$lte = maximum;
            }
        }

        // ------------------------------------------
        // FABRIC
        // ------------------------------------------

        if (fabric && fabric.trim()) {
            filter.fabric = new RegExp(
                fabric.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "i"
            );
        }

        // ------------------------------------------
        // COLOR
        // ------------------------------------------

        if (color && color.trim()) {
            filter.colors = new RegExp(
                color.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "i"
            );
        }

        // ------------------------------------------
        // OFFER
        // ------------------------------------------

        if (offer === "true") {
            filter["offer.enabled"] = true;
        }

        if (offer === "false") {
            filter.$or = [
                ...(filter.$or || []),
                { "offer.enabled": false },
                { "offer.enabled": { $exists: false } },
            ];
        }

        // ------------------------------------------
        // FEATURED
        // ------------------------------------------

        if (featured === "true") {
            filter.featured = true;
        }

        if (featured === "false") {
            filter.featured = false;
        }

        // ------------------------------------------
        // STOCK
        // ------------------------------------------

        if (inStock === "true") {
            filter.stock = { $gt: 0 };
        }

        if (inStock === "false") {
            filter.stock = { $lte: 0 };
        }

        // ==========================================
        // PAGINATION
        // ==========================================

        const currentPage = Math.max(Number(page) || 1, 1);
        const perPage = Math.min(
            Math.max(Number(limit) || 12, 1),
            100
        );

        const skip = (currentPage - 1) * perPage;

        // ==========================================
        // SORTING
        // ==========================================

        let sortOption = {
            createdAt: -1,
        };

        switch (sort) {
            case "newest":
                sortOption = { createdAt: -1 };
                break;

            case "oldest":
                sortOption = { createdAt: 1 };
                break;

            case "price_asc":
                sortOption = { price: 1 };
                break;

            case "price_desc":
                sortOption = { price: -1 };
                break;

            case "name_asc":
                sortOption = { name: 1 };
                break;

            case "name_desc":
                sortOption = { name: -1 };
                break;

            case "stock_high":
                sortOption = { stock: -1 };
                break;

            case "stock_low":
                sortOption = { stock: 1 };
                break;

            default:
                sortOption = { createdAt: -1 };
        }

        // ==========================================
        // QUERY
        // ==========================================

        const [products, totalProducts] = await Promise.all([
            Product.find(filter)
                .populate("category", "name slug image")
                .sort(sortOption)
                .skip(skip)
                .limit(perPage),

            Product.countDocuments(filter),
        ]);

        // ==========================================
        // ADD PRICING
        // ==========================================

        const productsWithPricing = products.map((product) => {
            const pricing = calculateProductPrice(product);

            return {
                ...product.toObject(),
                pricing,
            };
        });

        // ==========================================
        // RESPONSE
        // ==========================================

        const totalPages = Math.ceil(
            totalProducts / perPage
        );

        res.json({
            success: true,

            count: productsWithPricing.length,

            totalProducts,

            pagination: {
                currentPage,
                limit: perPage,
                totalPages,
                hasNextPage: currentPage < totalPages,
                hasPreviousPage: currentPage > 1,
            },

            filters: {
                search: search || null,
                category: category || null,
                minPrice:
                    minPrice !== undefined
                        ? Number(minPrice)
                        : null,
                maxPrice:
                    maxPrice !== undefined
                        ? Number(maxPrice)
                        : null,
                fabric: fabric || null,
                color: color || null,
                offer:
                    offer !== undefined
                        ? offer === "true"
                        : null,
                featured:
                    featured !== undefined
                        ? featured === "true"
                        : null,
                inStock:
                    inStock !== undefined
                        ? inStock === "true"
                        : null,
                sort,
            },

            products: productsWithPricing,
        });
    } catch (error) {
        console.error("Get products error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ==========================================
// GET SINGLE PRODUCT
// ==========================================

const getProduct = async (req, res) => {
    try {
        const product = await Product.findById(
            req.params.id
        ).populate(
            "category",
            "name slug image"
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        const pricing = calculateProductPrice(product);

        res.json({
            success: true,
            product,
            pricing,
        });
    } catch (error) {
        console.error("Get product error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ==========================================
// UPDATE PRODUCT
// ==========================================

const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(
            req.params.id
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // Verify category if changed
        if (req.body.category) {
            const categoryExists = await Category.findById(
                req.body.category
            );

            if (!categoryExists) {
                return res.status(404).json({
                    success: false,
                    message: "New category not found",
                });
            }
        }

        // Validate price
        if (
            req.body.price !== undefined &&
            Number(req.body.price) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Price cannot be negative",
            });
        }

        // Check duplicate slug
        if (
            req.body.slug &&
            req.body.slug !== product.slug
        ) {
            const existingProduct =
                await Product.findOne({
                    slug: req.body.slug,
                    _id: { $ne: product._id },
                });

            if (existingProduct) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Product with this slug already exists",
                });
            }
        }

        Object.assign(product, req.body);

        await product.save();

        bumpWebsiteVersion();

        const pricing = calculateProductPrice(product);

        res.json({
            success: true,
            message: "Product updated successfully",
            product,
            pricing,
        });
    } catch (error) {
        console.error("Update product error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ==========================================
// DELETE PRODUCT
// ==========================================

const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(
            req.params.id
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // Delete all product images from Cloudinary
        if (
            product.images &&
            product.images.length > 0
        ) {
            for (const image of product.images) {
                if (image.publicId) {
                    try {
                        await cloudinary.uploader.destroy(
                            image.publicId
                        );
                    } catch (cloudinaryError) {
                        console.error(
                            "Cloudinary image delete error:",
                            cloudinaryError.message
                        );
                    }
                }
            }
        }

        await Product.findByIdAndDelete(
            req.params.id
        );

        bumpWebsiteVersion();

        res.json({
            success: true,
            message:
                "Product and images deleted successfully",
        });
    } catch (error) {
        console.error("Delete product error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ==========================================
// SET MAIN PRODUCT IMAGE
// ==========================================

const setMainProductImage = async (req, res) => {
    try {
        const { imageId } = req.body;

        if (!imageId) {
            return res.status(400).json({
                success: false,
                message: "Image ID is required",
            });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        const imageExists = product.images.id(imageId);

        if (!imageExists) {
            return res.status(404).json({
                success: false,
                message: "Image not found",
            });
        }

        product.images.forEach((image) => {
            image.isMain = image._id.toString() === imageId;
        });

        await product.save();

        bumpWebsiteVersion();

        res.json({
            success: true,
            message: "Main image updated successfully",
            images: product.images,
        });
    } catch (error) {
        console.error("Set main image error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// DELETE INDIVIDUAL PRODUCT IMAGE
// ==========================================

const deleteProductImage = async (req, res) => {
    try {
        const { imageId } = req.params;

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        const image = product.images.id(imageId);

        if (!image) {
            return res.status(404).json({
                success: false,
                message: "Image not found",
            });
        }

        // Delete from Cloudinary first
        if (image.publicId) {
            try {
                await cloudinary.uploader.destroy(
                    image.publicId,
                    {
                        resource_type: "image",
                    }
                );
            } catch (cloudinaryError) {
                console.error(
                    "Cloudinary image delete error:",
                    cloudinaryError.message
                );
            }
        }

        const wasMain = image.isMain;

        image.deleteOne();

        // If deleted image was main,
        // automatically make first remaining image main
        if (
            wasMain &&
            product.images.length > 0
        ) {
            product.images.forEach(
                (item, index) => {
                    item.isMain = index === 0;
                }
            );
        }

        await product.save();

        bumpWebsiteVersion();

        res.json({
            success: true,
            message: "Product image deleted successfully",
            images: product.images,
        });
    } catch (error) {
        console.error(
            "Delete product image error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// REORDER PRODUCT IMAGES
// ==========================================

const reorderProductImages = async (req, res) => {
    try {
        const { imageIds } = req.body;

        if (
            !Array.isArray(imageIds) ||
            imageIds.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Image IDs array is required",
            });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        if (
            imageIds.length !== product.images.length
        ) {
            return res.status(400).json({
                success: false,
                message: "All product image IDs are required",
            });
        }

        const imageMap = new Map(
            product.images.map((image) => [
                image._id.toString(),
                image,
            ])
        );

        const reorderedImages = [];

        for (const imageId of imageIds) {
            const image = imageMap.get(
                imageId.toString()
            );

            if (!image) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid image ID",
                });
            }

            reorderedImages.push(image);
        }

        product.images = reorderedImages;

        // First image becomes main image
        product.images.forEach(
            (image, index) => {
                image.isMain = index === 0;
            }
        );

        await product.save();

        bumpWebsiteVersion();

        res.json({
            success: true,
            message: "Product images reordered successfully",
            images: product.images,
        });
    } catch (error) {
        console.error(
            "Reorder product images error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ==========================================
// UPLOAD PRODUCT IMAGES
// ==========================================

const uploadProductImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please upload at least one image",
            });
        }

        const uploadedImages = [];

        for (const file of req.files) {
            console.log(
                `Optimizing image: ${file.originalname} (${file.size} bytes)`
            );

            // Compress / resize image BEFORE sending to Cloudinary
            const optimizedBuffer = await sharp(file.buffer)
                .rotate()
                .resize({
                    width: 2000,
                    height: 2000,
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .jpeg({
                    quality: 85,
                    mozjpeg: true,
                })
                .toBuffer();

            console.log(
                `Optimized size: ${optimizedBuffer.length} bytes`
            );

            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: "handloom/products",
                        resource_type: "image",
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );

                stream.end(optimizedBuffer);
            });

            const optimizedUrl =
                getOptimizedImageUrl(result.public_id);

            uploadedImages.push({
                url: optimizedUrl,
                publicId: result.public_id,
                isMain: uploadedImages.length === 0,
            });
        }

        res.status(201).json({
            success: true,
            message: "Product images uploaded successfully",
            images: uploadedImages,
        });

    } catch (error) {
        console.error("=================================");
        console.error("PRODUCT IMAGE UPLOAD ERROR");
        console.error("Message:", error.message);
        console.error("Name:", error.name);
        console.error("HTTP Code:", error.http_code);
        console.error("Full Error:", error);
        console.error("=================================");

        res.status(500).json({
            success: false,
            message: "Image upload failed",
            error: error.message,
        });
    }
};

// ==========================================
// UPLOAD MAKING STEP IMAGE
// ==========================================

const uploadMakingStepImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload an image",
            });
        }

        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "handloom/making-steps",
                    resource_type: "image",
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );

            stream.end(req.file.buffer);
        });

        const optimizedUrl = getOptimizedImageUrl(
            result.public_id
        );

        res.status(201).json({
            success: true,
            message: "Making step image uploaded successfully",
            image: {
                url: optimizedUrl,
                publicId: result.public_id,
            },
        });
    } catch (error) {
        console.error(
            "Making step image upload error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Image upload failed",
        });
    }
};

// ==========================================
// ADD MAKING STEP
// ==========================================

const addMakingStep = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        const {
            step,
            title,
            description,
            image,
        } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Step title is required",
            });
        }

        if (
            image &&
            (!image.url || !image.publicId)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Image URL and publicId are required",
            });
        }

        const newStep = {
            step:
                step !== undefined
                    ? Number(step)
                    : product.catalog.makingSteps.length + 1,

            title,

            description: description || "",

            image: image || {
                url: "",
                publicId: "",
            },
        };

        product.catalog.makingSteps.push(newStep);

        // Keep steps ordered
        product.catalog.makingSteps.sort(
            (a, b) => a.step - b.step
        );

        await product.save();

        bumpWebsiteVersion();

        res.status(201).json({
            success: true,
            message: "Making step added successfully",
            product,
            makingSteps:
                product.catalog.makingSteps,
        });
    } catch (error) {
        console.error(
            "Add making step error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ==========================================
// UPDATE MAKING STEP
// ==========================================

const updateMakingStep = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        const step = product.catalog.makingSteps.id(
            req.params.stepId
        );

        if (!step) {
            return res.status(404).json({
                success: false,
                message: "Making step not found",
            });
        }

        const {
            step: stepNumber,
            title,
            description,
            image,
        } = req.body;

        // Update fields only if supplied
        if (stepNumber !== undefined) {
            step.step = Number(stepNumber);
        }

        if (title !== undefined) {
            step.title = title;
        }

        if (description !== undefined) {
            step.description = description;
        }

        // Replace image
        if (image) {
            if (!image.url || !image.publicId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Image URL and publicId are required",
                });
            }

            // Delete old Cloudinary image
            if (
                step.image &&
                step.image.publicId
            ) {
                try {
                    await cloudinary.uploader.destroy(
                        step.image.publicId
                    );
                } catch (cloudinaryError) {
                    console.error(
                        "Old making step image delete error:",
                        cloudinaryError.message
                    );
                }
            }

            step.image = {
                url: image.url,
                publicId: image.publicId,
            };
        }

        product.catalog.makingSteps.sort(
            (a, b) => a.step - b.step
        );

        await product.save();

        bumpWebsiteVersion();

        res.json({
            success: true,
            message:
                "Making step updated successfully",
            makingSteps:
                product.catalog.makingSteps,
        });
    } catch (error) {
        console.error(
            "Update making step error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ==========================================
// DELETE MAKING STEP
// ==========================================

const deleteMakingStep = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        const step = product.catalog.makingSteps.id(
            req.params.stepId
        );

        if (!step) {
            return res.status(404).json({
                success: false,
                message: "Making step not found",
            });
        }

        // Delete image from Cloudinary
        if (
            step.image &&
            step.image.publicId
        ) {
            try {
                await cloudinary.uploader.destroy(
                    step.image.publicId
                );
            } catch (cloudinaryError) {
                console.error(
                    "Making step image delete error:",
                    cloudinaryError.message
                );
            }
        }

        step.deleteOne();

        // Re-number remaining steps
        product.catalog.makingSteps.forEach(
            (item, index) => {
                item.step = index + 1;
            }
        );

        await product.save();

        bumpWebsiteVersion();

        res.json({
            success: true,
            message:
                "Making step deleted successfully",
            makingSteps:
                product.catalog.makingSteps,
        });
    } catch (error) {
        console.error(
            "Delete making step error:",
            error
        );

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
};