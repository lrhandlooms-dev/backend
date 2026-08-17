const express = require("express");

const {
  createOrder,
  getOrders,
  getMyOrders,
  getOrder,
  confirmPayment,
  rejectPayment,
  updateOrderStatus,
  deleteOrder,
} = require("../controllers/orderController");


// ==========================================================
// AUTH MIDDLEWARE
// ==========================================================

const userProtect =
  require("../middleware/userAuthMiddleware");

const adminProtect =
  require("../middleware/authMiddleware");


const router =
  express.Router();


// ==========================================================
// CUSTOMER
// CREATE ORDER
// ==========================================================

router.post(
  "/",
  userProtect,
  createOrder
);


// ==========================================================
// ADMIN
// GET ALL ORDERS
// ==========================================================

router.get(
  "/",
  adminProtect,
  getOrders
);


// ==========================================================
// CUSTOMER
// GET MY ORDERS
// ==========================================================

router.get(
  "/my-orders",
  userProtect,
  getMyOrders
);


// ==========================================================
// ADMIN
// GET SINGLE ORDER
// ==========================================================

router.get(
  "/:id",
  adminProtect,
  getOrder
);


// ==========================================================
// ADMIN
// CONFIRM PAYMENT
// ==========================================================

router.put(
  "/:id/confirm-payment",
  adminProtect,
  confirmPayment
);


// ==========================================================
// ADMIN
// REJECT PAYMENT
// ==========================================================

router.put(
  "/:id/reject-payment",
  adminProtect,
  rejectPayment
);


// ==========================================================
// ADMIN
// UPDATE ORDER STATUS
// ==========================================================

router.put(
  "/:id/status",
  adminProtect,
  updateOrderStatus
);


// ==========================================================
// ADMIN
// DELETE ORDER
// ==========================================================

router.delete(
  "/:id",
  adminProtect,
  deleteOrder
);


module.exports = router;