const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    // ==========================================
    // BASIC INFORMATION
    // ==========================================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    // ==========================================
    // CATEGORY
    // ==========================================

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    // ==========================================
    // PRICING
    // ==========================================

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==========================================
    // OFFER
    // ==========================================

    offer: {
      enabled: {
        type: Boolean,
        default: false,
      },

      type: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage",
      },

      value: {
        type: Number,
        default: 0,
        min: 0,
      },

      startDate: {
        type: Date,
        default: null,
      },

      endDate: {
        type: Date,
        default: null,
      },
    },

    // ==========================================
    // INVENTORY
    // ==========================================

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // PRODUCT IMAGES
    // ==========================================

    images: [
      {
        url: {
          type: String,
          required: true,
        },

        publicId: {
          type: String,
          required: true,
        },

        isMain: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // ==========================================
    // SAREE DETAILS
    // ==========================================

    fabric: {
      type: String,
      default: "",
      trim: true,
    },

    colors: [
      {
        type: String,
        trim: true,
      },
    ],

    length: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // CATALOG / CRAFT STORY
    // ==========================================

    catalog: {
      // ------------------------------------------
      // Materials
      // ------------------------------------------

      materialsUsed: {
        type: String,
        default: "",
      },

      // ------------------------------------------
      // Weaving
      // ------------------------------------------

      weavingTechnique: {
        type: String,
        default: "",
      },

      // ------------------------------------------
      // Overall Making Process
      // ------------------------------------------

      makingProcess: {
        type: String,
        default: "",
      },

      // ------------------------------------------
      // Time Required
      // ------------------------------------------

      timeRequired: {
        type: String,
        default: "",
      },

      // ------------------------------------------
      // Origin
      // ------------------------------------------

      origin: {
        type: String,
        default: "",
      },

      // ------------------------------------------
      // Artisan Information
      // ------------------------------------------

      artisanInformation: {
        type: String,
        default: "",
      },

      // ------------------------------------------
      // Care Instructions
      // ------------------------------------------

      careInstructions: {
        type: String,
        default: "",
      },

      // ==========================================
      // HOW IT'S MADE — STEP BY STEP
      // ==========================================

      makingSteps: [
        {
          step: {
            type: Number,
            required: true,
          },

          title: {
            type: String,
            required: true,
            trim: true,
          },

          description: {
            type: String,
            default: "",
          },

          image: {
            url: {
              type: String,
              default: "",
            },

            publicId: {
              type: String,
              default: "",
            },
          },
        },
      ],
    },

    // ==========================================
    // WEBSITE CONTROLS
    // ==========================================

    featured: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);