const mongoose = require("mongoose");


// ==========================================================
// ORDER ITEM
// ==========================================================

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);


// ==========================================================
// SHIPPING ADDRESS
// ==========================================================

const shippingAddressSchema =
  new mongoose.Schema(
    {
      fullName: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
      },

      address: {
        type: String,
        required: true,
        trim: true,
      },

      city: {
        type: String,
        required: true,
        trim: true,
      },

      state: {
        type: String,
        required: true,
        trim: true,
      },

      pincode: {
        type: String,
        required: true,
        trim: true,
      },

      country: {
        type: String,
        required: true,
        trim: true,
        default: "India",
      },
    },
    {
      _id: false,
    }
  );


// ==========================================================
// ORDER
// ==========================================================

const orderSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------
    // ORDER NUMBER
    // ------------------------------------------------------

    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },


    // ------------------------------------------------------
    // CUSTOMER
    // ------------------------------------------------------

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },


    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
      },
    },


    // ------------------------------------------------------
    // PRODUCTS
    // ------------------------------------------------------

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items.length > 0;
        },
        message:
          "Order must contain at least one product",
      },
    },


    // ------------------------------------------------------
    // SHIPPING
    // ------------------------------------------------------

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },


    // ------------------------------------------------------
    // PRICING
    // ------------------------------------------------------

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },


    // ------------------------------------------------------
    // PAYMENT
    // ------------------------------------------------------

    paymentMethod: {
      type: String,
      enum: [
        "upi",
      ],
      default: "upi",
    },


    paymentStatus: {
      type: String,
      enum: [
        "awaiting",
        "paid",
        "rejected",
      ],
      default: "awaiting",
      index: true,
    },


    transactionId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },


    paymentConfirmedAt: {
      type: Date,
      default: null,
    },


    // ------------------------------------------------------
    // ORDER STATUS
    // ------------------------------------------------------

    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },


    // ------------------------------------------------------
    // ADMIN NOTE
    // ------------------------------------------------------

    adminNote: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
  mongoose.model(
    "Order",
    orderSchema
  );