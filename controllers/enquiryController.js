const Enquiry = require("../models/Enquiry");

// ==========================================
// CREATE ENQUIRY
// PUBLIC
// ==========================================

const createEnquiry = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      subject,
      message,
      type,
      product,
      occasionDate,
    } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email and message are required",
      });
    }

    const enquiry = await Enquiry.create({
  name,
  email,
  phone,
  subject,
  message,
  type: type || "general",
  product: product || null,
  occasionDate: occasionDate || null,
});

    res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully",
      enquiry,
    });
  } catch (error) {
    console.error("Create enquiry error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to submit enquiry",
    });
  }
};


// ==========================================
// GET ALL ENQUIRIES
// ADMIN
// ==========================================

const getEnquiries = async (req, res) => {
  try {
    const {
      status,
      type,
      search,
    } = req.query;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (type && type !== "all") {
      filter.type = type;
    }

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
        {
          subject: {
            $regex: search,
            $options: "i",
          },
        },
        {
          message: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const enquiries =
      await Enquiry.find(filter)
        .populate(
          "product",
          "name slug price images"
        )
        .sort({
          createdAt: -1,
        });

    res.json({
      success: true,
      count: enquiries.length,
      enquiries,
    });
  } catch (error) {
    console.error("Get enquiries error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load enquiries",
    });
  }
};


// ==========================================
// GET SINGLE ENQUIRY
// ADMIN
// ==========================================

const getEnquiry = async (req, res) => {
  try {
    const enquiry =
      await Enquiry.findById(
        req.params.id
      ).populate(
        "product",
        "name slug price images"
      );

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    res.json({
      success: true,
      enquiry,
    });
  } catch (error) {
    console.error(
      "Get enquiry error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to load enquiry",
    });
  }
};


// ==========================================
// UPDATE ENQUIRY STATUS
// ADMIN
// ==========================================

const updateEnquiryStatus = async (
  req,
  res
) => {
  try {
    const {
      status,
    } = req.body;

    if (
      ![
        "new",
        "read",
        "replied",
      ].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry status",
      });
    }

    const enquiry =
      await Enquiry.findByIdAndUpdate(
        req.params.id,
        {
          status,
        },
        {
          new: true,
        }
      );

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    res.json({
      success: true,
      message:
        "Enquiry status updated successfully",
      enquiry,
    });
  } catch (error) {
    console.error(
      "Update enquiry status error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to update status",
    });
  }
};


// ==========================================
// UPDATE ADMIN NOTE
// ADMIN
// ==========================================

const updateAdminNote = async (
  req,
  res
) => {
  try {
    const {
      adminNote,
    } = req.body;

    const enquiry =
      await Enquiry.findByIdAndUpdate(
        req.params.id,
        {
          adminNote:
            adminNote || "",
        },
        {
          new: true,
        }
      );

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    res.json({
      success: true,
      message: "Admin note updated",
      enquiry,
    });
  } catch (error) {
    console.error(
      "Update admin note error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to update admin note",
    });
  }
};


// ==========================================
// DELETE ENQUIRY
// ADMIN
// ==========================================

const deleteEnquiry = async (
  req,
  res
) => {
  try {
    const enquiry =
      await Enquiry.findByIdAndDelete(
        req.params.id
      );

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    res.json({
      success: true,
      message:
        "Enquiry deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete enquiry error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to delete enquiry",
    });
  }
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
  createEnquiry,
  getEnquiries,
  getEnquiry,
  updateEnquiryStatus,
  updateAdminNote,
  deleteEnquiry,
};