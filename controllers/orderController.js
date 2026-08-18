const Order = require("../models/Order");
const Product = require("../models/Product");
const sendEmail = require("../utils/sendEmail");


// ==========================================================
// CREATE ORDER
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
        // VALIDATE PRODUCTS
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
                await Product.findById(productId);


            if (!product) {

                return res.status(404).json({
                    success: false,
                    message:
                        "One of the products in your cart no longer exists",
                });

            }


            if (product.isActive === false) {

                return res.status(400).json({
                    success: false,
                    message:
                        `${product.name} is currently unavailable`,
                });

            }


            const quantity =
                Math.max(
                    1,
                    Number(item.quantity) || 1
                );


            // ------------------------------------------------------
            // STOCK CHECK
            // ------------------------------------------------------

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


            // ------------------------------------------------------
            // DATABASE PRICE
            // ------------------------------------------------------

            const price =
                Number(product.price) || 0;


            const itemTotal =
                price * quantity;


            subtotal += itemTotal;


            // ------------------------------------------------------
            // IMAGE
            // ------------------------------------------------------

            let image = "";


            if (
                Array.isArray(product.images) &&
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


                if (
                    typeof mainImage === "string"
                ) {

                    image = mainImage;

                } else if (mainImage) {

                    image =
                        mainImage.url ||
                        mainImage.secure_url ||
                        mainImage.src ||
                        "";

                }

            }


            // ------------------------------------------------------
            // ORDER ITEM
            // ------------------------------------------------------

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
            subtotal + shippingFee;


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
                    String(transactionId).trim(),

                orderStatus:
                    "pending",

            });


        // ======================================================
        // ORDER RECEIVED EMAIL
        // ======================================================

        sendEmail({

            to:
                order.customer.email,

            subject:
                `Order Received 🎉 — ${order.orderNumber}`,

            html: `
                <div style="
                    max-width:650px;
                    margin:0 auto;
                    padding:40px 25px;
                    background:#f4f0e8;
                    color:#211f1b;
                    font-family:Arial,sans-serif;
                ">

                    <h1 style="
                        font-family:Georgia,serif;
                        font-weight:400;
                        font-size:36px;
                    ">
                        Order Received 🎉
                    </h1>

                    <p>
                        Dear ${order.customer.name},
                    </p>

                    <p>
                        Thank you for choosing
                        <strong>LR Handlooms</strong>.
                        Your order has been received successfully.
                    </p>

                    <div style="
                        margin:30px 0;
                        padding:25px;
                        background:#ebe5da;
                    ">

                        <p>
                            <strong>Order:</strong>
                            ${order.orderNumber}
                        </p>

                        <p>
                            <strong>Total:</strong>
                            ₹${order.total.toLocaleString("en-IN")}
                        </p>

                        <p>
                            <strong>Payment:</strong>
                            Awaiting payment confirmation
                        </p>

                        <p>
                            <strong>Order Status:</strong>
                            Pending
                        </p>

                    </div>

                    <p>
                        We have received your payment details.
                        Our team will verify the transaction shortly.
                    </p>

                    <p>
                        Once your payment is confirmed,
                        you will receive another email.
                    </p>

                    <br>

                    <p>
                        Warm regards,<br>
                        <strong>LR HANDLOOMS</strong><br>
                        Made in Maniabandha
                    </p>

                </div>
            `,

        }).catch(error => {

            console.error(
                "Order received email error:",
                error.message
            );

        });


        // ======================================================
        // ADMIN NEW ORDER EMAIL
        // ======================================================

        sendEmail({

            to: process.env.MAIL_USER,

            subject:
                `🔔 New Order Received — ${order.orderNumber}`,

            html: `
        <div style="
            max-width:650px;
            margin:0 auto;
            padding:40px 25px;
            background:#f4f0e8;
            color:#211f1b;
            font-family:Arial,sans-serif;
        ">

            <h1 style="
                font-family:Georgia,serif;
                font-weight:400;
                font-size:36px;
            ">
                New Order Received 🔔
            </h1>

            <p>
                A new order has been placed on
                <strong>LR Handlooms</strong>.
            </p>

            <div style="
                margin:30px 0;
                padding:25px;
                background:#ebe5da;
            ">

                <p>
                    <strong>Order:</strong>
                    ${order.orderNumber}
                </p>

                <p>
                    <strong>Customer:</strong>
                    ${order.customer.name}
                </p>

                <p>
                    <strong>Email:</strong>
                    ${order.customer.email}
                </p>

                <p>
                    <strong>Phone:</strong>
                    ${order.customer.phone}
                </p>

                <p>
                    <strong>Total:</strong>
                    ₹${order.total.toLocaleString("en-IN")}
                </p>

                <p>
                    <strong>Payment:</strong>
                    UPI
                </p>

                <p>
                    <strong>Payment Status:</strong>
                    Awaiting verification
                </p>

                <p>
                    <strong>Transaction ID / UTR:</strong>
                    ${order.transactionId}
                </p>

                <p>
                    <strong>Order Status:</strong>
                    Pending
                </p>

            </div>

            <h3>Shipping Address</h3>

            <p>
                ${order.shippingAddress.fullName}<br>
                ${order.shippingAddress.address}<br>
                ${order.shippingAddress.city},
                ${order.shippingAddress.state}
                - ${order.shippingAddress.pincode}<br>
                ${order.shippingAddress.country}
            </p>

            <br>

            <p>
                Please open the admin panel and verify the payment.
            </p>

            <br>

            <p>
                Warm regards,<br>
                <strong>LR HANDLOOMS</strong><br>
                Made in Maniabandha
            </p>

        </div>
    `,

        }).catch(error => {

            console.error(
                "Admin new order email error:",
                error.message
            );

        });


        // ------------------------------------------------------
        // RESPONSE
        // ------------------------------------------------------

        return res.status(201).json({

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


        return res.status(500).json({

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
            ).padStart(2, "0");


        const day =
            String(
                now.getDate()
            ).padStart(2, "0");


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

const getMyOrders =
    async (req, res) => {

        try {

            if (
                !req.user ||
                !req.user._id
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Not authorized. Please login.",

                });

            }


            const orders =
                await Order.find({

                    user:
                        req.user._id,

                })
                    .sort({
                        createdAt: -1,
                    })
                    .lean();


            return res.status(200).json({

                success: true,

                count:
                    orders.length,

                orders,

            });


        } catch (error) {

            console.error(
                "Get my orders error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load your orders",

                error:
                    error.message,

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
                await Order.find(filter)
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


            return res.json({

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


            return res.status(500).json({

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


            return res.json({

                success: true,

                order,

            });


        } catch (error) {

            console.error(
                "Get order error:",
                error
            );


            return res.status(500).json({

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


            // ======================================================
            // PAYMENT CONFIRMED EMAIL
            // ======================================================

            sendEmail({

                to:
                    order.customer.email,

                subject:
                    `Payment Confirmed ✅ — ${order.orderNumber}`,

                html: `
                    <div style="
                        max-width:650px;
                        margin:0 auto;
                        padding:40px 25px;
                        background:#f4f0e8;
                        color:#211f1b;
                        font-family:Arial,sans-serif;
                    ">

                        <h1 style="
                            font-family:Georgia,serif;
                            font-weight:400;
                            font-size:36px;
                        ">
                            Payment Confirmed ✅
                        </h1>

                        <p>
                            Dear ${order.customer.name},
                        </p>

                        <p>
                            Your payment has been successfully verified.
                            Your order is now confirmed.
                        </p>

                        <div style="
                            margin:30px 0;
                            padding:25px;
                            background:#ebe5da;
                        ">

                            <p>
                                <strong>Order:</strong>
                                ${order.orderNumber}
                            </p>

                            <p>
                                <strong>Amount:</strong>
                                ₹${order.total.toLocaleString("en-IN")}
                            </p>

                            <p>
                                <strong>Payment:</strong>
                                Confirmed
                            </p>

                            <p>
                                <strong>Order Status:</strong>
                                Confirmed
                            </p>

                        </div>

                        <p>
                            Thank you for choosing LR Handlooms.
                            We will keep you updated as your order
                            moves through processing and delivery.
                        </p>

                        <br>

                        <p>
                            Warm regards,<br>
                            <strong>LR HANDLOOMS</strong><br>
                            Made in Maniabandha
                        </p>

                    </div>
                `,

            }).catch(error => {

                console.error(
                    "Payment confirmation email error:",
                    error.message
                );

            });


            // ------------------------------------------------------
            // RESPONSE
            // ------------------------------------------------------

            return res.json({

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


            return res.status(500).json({

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


            // ======================================================
            // PAYMENT REJECTED EMAIL
            // ======================================================

            sendEmail({

                to:
                    order.customer.email,

                subject:
                    `Payment Verification Update — ${order.orderNumber}`,

                html: `
                    <div style="
                        max-width:650px;
                        margin:0 auto;
                        padding:40px 25px;
                        background:#f4f0e8;
                        color:#211f1b;
                        font-family:Arial,sans-serif;
                    ">

                        <h1 style="
                            font-family:Georgia,serif;
                            font-weight:400;
                            font-size:36px;
                        ">
                            Payment Verification Update
                        </h1>

                        <p>
                            Dear ${order.customer.name},
                        </p>

                        <p>
                            We were unable to confirm the payment
                            for your order.
                        </p>

                        <div style="
                            margin:30px 0;
                            padding:25px;
                            background:#ebe5da;
                        ">

                            <p>
                                <strong>Order:</strong>
                                ${order.orderNumber}
                            </p>

                            <p>
                                <strong>Amount:</strong>
                                ₹${order.total.toLocaleString("en-IN")}
                            </p>

                            <p>
                                <strong>Payment:</strong>
                                Verification failed
                            </p>

                        </div>

                        <p>
                            If you believe the payment was completed
                            successfully, please contact LR Handlooms
                            with your transaction details.
                        </p>

                        <br>

                        <p>
                            Warm regards,<br>
                            <strong>LR HANDLOOMS</strong><br>
                            Made in Maniabandha
                        </p>

                    </div>
                `,

            }).catch(error => {

                console.error(
                    "Payment rejection email error:",
                    error.message
                );

            });


            // ------------------------------------------------------
            // RESPONSE
            // ------------------------------------------------------

            return res.json({

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


            return res.status(500).json({

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
                !validStatuses.includes(status)
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


            return res.json({

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


            return res.status(500).json({

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


            return res.json({

                success: true,

                message:
                    "Order deleted successfully",

            });


        } catch (error) {

            console.error(
                "Delete order error:",
                error
            );


            return res.status(500).json({

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