const Order = require("../models/Order");
const Product = require("../models/Product");


// ==========================================================
// CREATE ORDER
// PUBLIC / LOGGED-IN USER
// ==========================================================

const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      transactionId,
    } = req.body;


    // ------------------------------------------------------
    // BASIC VALIDATION
    // ------------------------------------------------------

    if (
      !Array.isArray(items) ||
      !items.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty",
      });
    }


    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }


    const {
      fullName,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      country,
    } = shippingAddress;


    if (
      !fullName ||
      !email ||
      !phone ||
      !address ||
      !city ||
      !state ||
      !pincode ||
      !country
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Complete shipping address is required",
      });
    }


    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message:
          "Transaction ID / UTR is required",
      });
    }


    // ------------------------------------------------------
    // VALIDATE PRODUCTS FROM DATABASE
    // ------------------------------------------------------

    const orderItems = [];

    let subtotal = 0;


    for (const item of items) {

      const productId =
        item.product ||
        item.productId ||
        item._id ||
        item.id;


      if (!productId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product in cart",
        });
      }


      const product =
        await Product.findById(
          productId
        );


      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "One of the products in your cart no longer exists",
        });
      }


      if (
        product.isActive === false
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${product.name} is currently unavailable`,
        });
      }


      // ----------------------------------------------------
      // QUANTITY
      // ----------------------------------------------------

      const quantity =
        Math.max(
          1,
          Number(
            item.quantity
          ) || 1
        );


      // ----------------------------------------------------
      // STOCK CHECK
      // ----------------------------------------------------

      if (
        typeof product.stock === "number" &&
        product.stock < quantity
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${product.name} does not have enough stock`,
        });
      }


      // ----------------------------------------------------
      // USE DATABASE PRICE
      // NEVER TRUST FRONTEND PRICE
      // ----------------------------------------------------

      const price =
        Number(
          product.price
        ) || 0;


      const itemTotal =
        price * quantity;


      subtotal +=
        itemTotal;


      // ----------------------------------------------------
      // IMAGE
      // ----------------------------------------------------

      let image = "";


      if (
        Array.isArray(
          product.images
        ) &&
        product.images.length
      ) {

        const mainImage =
          product.images.find(
            img =>
              img &&
              (
                img.isMain ||
                img.main
              )
          ) ||
          product.images[0];


        if (typeof mainImage === "string") {
          image = mainImage;
        } else if (mainImage) {
          image =
            mainImage.url ||
            mainImage.secure_url ||
            mainImage.src ||
            "";
        }

      }


      // ----------------------------------------------------
      // ORDER ITEM
      // ----------------------------------------------------

      orderItems.push({

        product:
          product._id,

        name:
          product.name,

        image,

        price,

        quantity,

        total:
          itemTotal,

      });

    }


    // ------------------------------------------------------
    // SHIPPING
    // ------------------------------------------------------

    const shippingFee = 0;


    const total =
      subtotal +
      shippingFee;


    // ------------------------------------------------------
    // ORDER NUMBER
    // ------------------------------------------------------

    const orderNumber =
      await generateOrderNumber();


    // ------------------------------------------------------
    // USER
    // ------------------------------------------------------

    let userId = null;


    if (
      req.user &&
      req.user._id
    ) {
      userId =
        req.user._id;
    }


    // ------------------------------------------------------
    // CREATE ORDER
    // ------------------------------------------------------

    const order =
      await Order.create({

        orderNumber,

        user:
          userId,

        customer: {

          name:
            fullName,

          email:
            email,

          phone:
            phone,

        },


        items:
          orderItems,


        shippingAddress: {

          fullName,

          email,

          phone,

          address,

          city,

          state,

          pincode,

          country,

        },


        subtotal,

        shippingFee,

        total,


        paymentMethod:
          "upi",

        paymentStatus:
          "awaiting",

        transactionId:
          String(
            transactionId
          ).trim(),

        orderStatus:
          "pending",

      });


    // ------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------

    res.status(201).json({

      success: true,

      message:
        "Order received successfully",

      order: {

        id:
          order._id,

        orderNumber:
          order.orderNumber,

        total:
          order.total,

        paymentStatus:
          order.paymentStatus,

        orderStatus:
          order.orderStatus,

      },

    });


  } catch (error) {

    console.error(
      "Create order error:",
      error
    );


    res.status(500).json({

      success: false,

      message:
        "Unable to create order",

    });

  }
};


// ==========================================================
// GENERATE ORDER NUMBER
// ==========================================================

const generateOrderNumber =
  async () => {

    const now =
      new Date();


    const year =
      now.getFullYear();


    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      );


    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      );


    const prefix =
      `LRH-${year}${month}${day}`;


    const count =
      await Order.countDocuments({

        createdAt: {

          $gte:
            new Date(
              year,
              now.getMonth(),
              now.getDate()
            ),

          $lt:
            new Date(
              year,
              now.getMonth(),
              now.getDate() + 1
            ),

        },

      });


    return `${prefix}-${String(
      count + 1
    ).padStart(3, "0")}`;

  };


  // ==========================================================
// GET MY ORDERS
// CUSTOMER
// ==========================================================

const getMyOrders = async (req, res) => {
  try {

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please login.",
      });
    }


    const orders =
      await Order.find({
        user: req.user._id,
      })
        .populate(
          "items.product",
          "name slug price images"
        )
        .sort({
          createdAt: -1,
        });


    res.json({
      success: true,
      count: orders.length,
      orders,
    });


  } catch (error) {

    console.error(
      "Get my orders error:",
      error
    );


    res.status(500).json({
      success: false,
      message:
        "Unable to load your orders",
    });

  }
};


// ==========================================================
// GET ALL ORDERS
// ADMIN
// ==========================================================

const getOrders =
  async (req, res) => {

    try {

      const {
        paymentStatus,
        orderStatus,
        search,
      } = req.query;


      const filter = {};


      if (
        paymentStatus &&
        paymentStatus !== "all"
      ) {

        filter.paymentStatus =
          paymentStatus;

      }


      if (
        orderStatus &&
        orderStatus !== "all"
      ) {

        filter.orderStatus =
          orderStatus;

      }


      if (search) {

        filter.$or = [

          {
            orderNumber: {
              $regex:
                search,
              $options: "i",
            },
          },

          {
            "customer.name": {
              $regex:
                search,
              $options: "i",
            },
          },

          {
            "customer.email": {
              $regex:
                search,
              $options: "i",
            },
          },

          {
            transactionId: {
              $regex:
                search,
              $options: "i",
            },
          },

        ];

      }


      const orders =
        await Order.find(
          filter
        )
        .populate(
          "user",
          "name email phone"
        )
        .populate(
          "items.product",
          "name slug price images"
        )
        .sort({
          createdAt: -1,
        });


      res.json({

        success: true,

        count:
          orders.length,

        orders,

      });

    } catch (error) {

      console.error(
        "Get orders error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to load orders",

      });

    }

  };


// ==========================================================
// GET SINGLE ORDER
// ADMIN
// ==========================================================

const getOrder =
  async (req, res) => {

    try {

      const order =
        await Order.findById(
          req.params.id
        )
        .populate(
          "user",
          "name email phone"
        )
        .populate(
          "items.product",
          "name slug price images"
        );


      if (!order) {

        return res.status(404).json({

          success: false,

          message:
            "Order not found",

        });

      }


      res.json({

        success: true,

        order,

      });

    } catch (error) {

      console.error(
        "Get order error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to load order",

      });

    }

  };


// ==========================================================
// CONFIRM PAYMENT
// ADMIN
// ==========================================================

const confirmPayment =
  async (req, res) => {

    try {

      const order =
        await Order.findById(
          req.params.id
        );


      if (!order) {

        return res.status(404).json({

          success: false,

          message:
            "Order not found",

        });

      }


      if (
        order.paymentStatus ===
        "paid"
      ) {

        return res.json({

          success: true,

          message:
            "Payment is already confirmed",

          order,

        });

      }


      order.paymentStatus =
        "paid";


      order.paymentConfirmedAt =
        new Date();


      order.orderStatus =
        "confirmed";


      await order.save();


      res.json({

        success: true,

        message:
          "Payment confirmed successfully",

        order,

      });

    } catch (error) {

      console.error(
        "Confirm payment error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to confirm payment",

      });

    }

  };


// ==========================================================
// REJECT PAYMENT
// ADMIN
// ==========================================================

const rejectPayment =
  async (req, res) => {

    try {

      const order =
        await Order.findById(
          req.params.id
        );


      if (!order) {

        return res.status(404).json({

          success: false,

          message:
            "Order not found",

        });

      }


      order.paymentStatus =
        "rejected";


      order.orderStatus =
        "cancelled";


      await order.save();


      res.json({

        success: true,

        message:
          "Payment rejected",

        order,

      });

    } catch (error) {

      console.error(
        "Reject payment error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to reject payment",

      });

    }

  };


// ==========================================================
// UPDATE ORDER STATUS
// ADMIN
// ==========================================================

const updateOrderStatus =
  async (req, res) => {

    try {

      const {
        status,
      } = req.body;


      const validStatuses = [

        "pending",

        "confirmed",

        "processing",

        "shipped",

        "delivered",

        "cancelled",

      ];


      if (
        !validStatuses.includes(
          status
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid order status",

        });

      }


      const order =
        await Order.findByIdAndUpdate(

          req.params.id,

          {
            orderStatus:
              status,
          },

          {
            new: true,
          }

        );


      if (!order) {

        return res.status(404).json({

          success: false,

          message:
            "Order not found",

        });

      }


      res.json({

        success: true,

        message:
          "Order status updated successfully",

        order,

      });

    } catch (error) {

      console.error(
        "Update order status error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to update order status",

      });

    }

  };


// ==========================================================
// DELETE ORDER
// ADMIN
// ==========================================================

const deleteOrder =
  async (req, res) => {

    try {

      const order =
        await Order.findByIdAndDelete(
          req.params.id
        );


      if (!order) {

        return res.status(404).json({

          success: false,

          message:
            "Order not found",

        });

      }


      res.json({

        success: true,

        message:
          "Order deleted successfully",

      });

    } catch (error) {

      console.error(
        "Delete order error:",
        error
      );


      res.status(500).json({

        success: false,

        message:
          "Unable to delete order",

      });

    }

  };


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

  createOrder,

  getOrders,

  getMyOrders,

  getOrder,

  confirmPayment,

  rejectPayment,

  updateOrderStatus,

  deleteOrder,

};