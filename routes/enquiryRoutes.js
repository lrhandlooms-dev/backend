const express = require("express");

const {
  createEnquiry,
  getEnquiries,
  getEnquiry,
  updateEnquiryStatus,
  updateAdminNote,
  deleteEnquiry,
} = require("../controllers/enquiryController");

const protect =
  require("../middleware/authMiddleware");

const router =
  express.Router();


// ==========================================
// PUBLIC
// ==========================================

router.post(
  "/",
  createEnquiry
);


// ==========================================
// ADMIN
// ==========================================

router.get(
  "/",
  protect,
  getEnquiries
);


router.get(
  "/:id",
  protect,
  getEnquiry
);


router.put(
  "/:id/status",
  protect,
  updateEnquiryStatus
);


router.put(
  "/:id/note",
  protect,
  updateAdminNote
);


router.delete(
  "/:id",
  protect,
  deleteEnquiry
);


module.exports = router;