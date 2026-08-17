// const express = require("express");

// const {
//   createAdmin,
//   loginAdmin,
// } = require("../controllers/adminController");

// const router = express.Router();

// router.post("/create", createAdmin);
// router.post("/login", loginAdmin);

// module.exports = router;

const express = require("express");

const {
  createAdmin,
  loginAdmin,
} = require("../controllers/adminController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create", createAdmin);
router.post("/login", loginAdmin);

router.get("/profile", protect, (req, res) => {
  res.json({
    success: true,
    message: "Protected admin route working",
    admin: req.admin,
  });
});

module.exports = router;