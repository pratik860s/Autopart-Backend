const { sequelize } = require("../../../configs/db");
const Products = require("../../../models/products");
const User = require("../../../models/user");
const Enquiries = require("../../../models/enquiries");
const EnquiryItems = require("../../../models/enquiry_items");
const QuotationItems = require("../../../models/quotation_items");
const Quotation = require("../../../models/quotations");
const Feedback = require("../../../models/feedback");
const ProductType = require("../../../models/product_type");
const Vehicle = require("../../../models/vehicle");
const Message = require("../../../models/message");
const { sendAdminNotification } = require("../../../services/emailService");
const { createError } = require("../../../utils/errorHandler");
const { Op } = require("sequelize");
const { sendVerificationEmail, transporter } = require("../../../utils/mailer");
const { paginateResults } = require("../../../utils/pagination");
const { EnquirySeller } = require("../../../models");

exports.verifyProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { action } = req.body; // "accept" or "reject"

    const product = await Products.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (action === "accept") {
      product.is_verified = true;
      await product.save();
      return res
        .status(200)
        .json({ message: "Product accepted successfully", product });
    } else if (action === "reject") {
      await product.destroy();
      return res
        .status(200)
        .json({ message: "Product rejected and deleted successfully" });
    } else {
      return res
        .status(400)
        .json({ message: "Invalid action. Use 'accept' or 'reject'." });
    }
  } catch (error) {
    console.error("Error verifying product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getPendingProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const products = await Products.findAndCountAll({
      where: { is_verified: false },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["created_at", "DESC"]],
    });

    res.status(200).json({
      status: "success",
      data: products.rows,
      total: products.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(products.count / limit),
    });
  } catch (error) {
    console.error("Error fetching pending products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// User Management
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, userType, verified } = req.query;

    // Convert page and limit to integers with defaults
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;

    const query = {};
    if (status) query.status = status;
    if (userType) query.type = userType;
    if (verified !== undefined) query.email_verified = verified;

    // Get users with basic information
    const users = await User.findAndCountAll({
      where: query,
      attributes: { exclude: ["password"] },
      order: [["created_at", "DESC"]],
      limit: limitInt,
      offset: offset,
    });

    // Get all user IDs
    const userIds = users.rows.map((user) => user.id);

    // Get enquiry counts and last dates for buyers
    const buyerStats = await Enquiries.findAll({
      attributes: [
        "buyer_id",
        [sequelize.fn("COUNT", sequelize.col("id")), "enquiry_count"],
        [sequelize.fn("MAX", sequelize.col("created_at")), "last_enquiry_date"],
      ],
      where: {
        buyer_id: userIds,
      },
      group: ["buyer_id"],
    });

    // Get quotation counts and last dates for sellers
    const sellerStats = await Quotation.findAll({
      attributes: [
        "seller_id",
        [sequelize.fn("COUNT", sequelize.col("id")), "quotation_count"],
        [
          sequelize.fn("MAX", sequelize.col("created_at")),
          "last_quotation_date",
        ],
      ],
      where: {
        seller_id: userIds,
      },
      group: ["seller_id"],
    });

    // Create maps for quick lookup
    const buyerStatsMap = buyerStats.reduce((acc, stat) => {
      acc[stat.buyer_id] = {
        enquiry_count: parseInt(stat.getDataValue("enquiry_count")),
        last_enquiry_date: stat.getDataValue("last_enquiry_date"),
      };
      return acc;
    }, {});

    const sellerStatsMap = sellerStats.reduce((acc, stat) => {
      acc[stat.seller_id] = {
        quotation_count: parseInt(stat.getDataValue("quotation_count")),
        last_quotation_date: stat.getDataValue("last_quotation_date"),
      };
      return acc;
    }, {});

    // Format the response with additional information
    const formattedUsers = users.rows.map((user) => {
      const userData = user.toJSON();
      const additionalData = {};

      // Add buyer stats if they exist
      if (buyerStatsMap[user.id]) {
        additionalData.enquiry_count = buyerStatsMap[user.id].enquiry_count;
        additionalData.last_enquiry_date =
          buyerStatsMap[user.id].last_enquiry_date;
      } else if (userData.type === "buyer") {
        additionalData.enquiry_count = 0;
        additionalData.last_enquiry_date = null;
      }

      // Add seller stats if they exist
      if (sellerStatsMap[user.id]) {
        additionalData.quotation_count =
          sellerStatsMap[user.id].quotation_count;
        additionalData.last_quotation_date =
          sellerStatsMap[user.id].last_quotation_date;
      } else if (userData.type === "seller") {
        additionalData.quotation_count = 0;
        additionalData.last_quotation_date = null;
      }

      return {
        ...userData,
        ...additionalData,
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(users.count / limitInt);

    res.status(200).json({
      success: true,
      data: formattedUsers,
      pagination: {
        total: users.count,
        page: pageInt,
        limit: limitInt,
        pages: totalPages,
        hasNextPage: pageInt < totalPages,
        hasPrevPage: pageInt > 1,
      },
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    next(error);
  }
};

exports.getUserDetails = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return next(createError(404, "User not found"));
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const validStatuses = ["active", "banned", "inactive"];

    if (!validStatuses.includes(status)) {
      return next(createError(400, "Invalid status"));
    }

    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return next(createError(404, "User not found"));
    }

    user.status = status;
    await user.save();

    // Send email notification
    await sendAdminNotification({
      to: user.email,
      type: "user_status",
      data: { status, reason },
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.verifySeller = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return next(createError(404, "User not found"));
    }

    user.is_verified = true;
    user.verified_at = new Date();
    await user.save();

    // Send email notification
    await sendAdminNotification({
      to: user.email,
      type: "seller_verification",
      data: {},
    });

    if (
      user.type === "seller" &&
      user.is_verified &&
      user.status === "pending"
    ) {
      user.status = "active";
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Enquiry Management
exports.getAllEnquiries = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = {};
    if (status) query.status = status;

    const totalEnquiries = await Enquiries.count({ where: query });
    // First get all enquiries
    const enquiries = await Enquiries.findAndCountAll({
      where: query,
      include: [
        {
          model: User,
          as: "enquiry_sellers",
          attributes: ["id", "name", "email"],
          through: { attributes: [] },
        },
        {
          model: User,
          as: "buyer",
          attributes: ["id", "name", "email"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "make", "model", "year", "gearbox", "fuel"],
        },
        {
          model: EnquiryItems,
          attributes: ["id", "product_type_id", "status", "details", "image"],
          include: [
            {
              model: ProductType,
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      separate: true,
    });

    // Get quotation counts for each enquiry
    const enquiryIds = enquiries.rows.map((enquiry) => enquiry.id);
    const quotationCounts = await Quotation.findAll({
      attributes: [
        "enquiry_id",
        [sequelize.fn("COUNT", sequelize.col("id")), "quotation_count"],
      ],
      where: {
        enquiry_id: enquiryIds,
      },
      group: ["enquiry_id"],
    });

    // Create a map of enquiry_id to quotation count
    const quotationCountMap = quotationCounts.reduce((acc, curr) => {
      acc[curr.enquiry_id] = parseInt(curr.getDataValue("quotation_count"));
      return acc;
    }, {});

    // Format the response
    const formattedEnquiries = enquiries.rows.map((enquiry) => {
      const enquiryData = enquiry.toJSON();
      return {
        ...enquiryData,
        // sellers: enquiryData.enquiry_sellers || [],
        quotation_count: quotationCountMap[enquiry.id] || 0,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedEnquiries,
      pagination: {
        total: totalEnquiries,
        page: parseInt(page),
        pages: Math.ceil(totalEnquiries / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error in getAllEnquiries:", error);
    next(error);
  }
};

exports.getEnquiryDetails = async (req, res, next) => {
  try {
    // Get enquiry with buyer and sellers
    const enquiry = await Enquiries.findByPk(req.params.enquiryId, {
      include: [
        {
          model: User,
          as: "enquiry_sellers",
          attributes: ["id", "name", "email"],
          through: { attributes: [] },
        },
        {
          model: Vehicle,
          attributes: ["id", "make", "model", "year", "gearbox", "fuel"],
        },
      ],
    });

    if (!enquiry) {
      return next(createError(404, "Enquiry not found"));
    }

    // Get quotations
    const quotations = await Quotation.findAll({
      where: { enquiry_id: enquiry.id },
      include: [
        {
          model: User,
          as: "seller",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    // Format the response
    const formattedEnquiry = {
      ...enquiry.toJSON(),
      quotations,
    };

    res.status(200).json({
      success: true,
      data: formattedEnquiry,
    });
  } catch (error) {
    console.error("Error in getEnquiryDetails:", error);
    next(error);
  }
};

// exports.getAllConversations = async (req, res, next) => {
//   try {
//     // Parse pagination params
//     const { page = 1, limit = 10 } = req.query;
//     const pageInt = parseInt(page) || 1;
//     const limitInt = parseInt(limit) || 10;
//     const offset = (pageInt - 1) * limitInt;

//     // Get total count of unique room_ids
//     const totalRooms = await Message.count({
//       distinct: true,
//       col: "room_id",
//     });

//     // Get paginated unique room_ids with the latest message timestamp
//     const rooms = await Message.findAll({
//       attributes: [
//         "room_id",
//         [sequelize.fn("MAX", sequelize.col("timestamp")), "last_message_time"],
//       ],
//       group: ["room_id"],
//       order: [[sequelize.fn("MAX", sequelize.col("timestamp")), "DESC"]],
//       limit: limitInt,
//       offset: offset,
//       raw: true,
//     });

//     // For each unique room, get conversation summary
//     const conversations = await Promise.all(
//       rooms.map(async (room) => {
//         // Get all messages for this room
//         const messages = await Message.findAll({
//           where: { room_id: room.room_id },
//           order: [["timestamp", "ASC"]],
//         });

//         if (!messages.length) return null; // No messages, skip

//         // Get participants (buyer and seller)
//         const sender = await User.findByPk(messages[0].sender_id);
//         const receiver = await User.findByPk(messages[0].receiver_id);

//         // If either participant is missing, skip this conversation
//         if (!sender || !receiver) return null;

//         // Get the last message
//         const lastMessage = messages[messages.length - 1];

//         // Determine status (example logic, adjust as needed)
//         let status = "Active";
//         if (
//           lastMessage &&
//           lastMessage.content &&
//           lastMessage.content.toLowerCase().includes("escalate")
//         ) {
//           status = "Escalated";
//         } else if (
//           lastMessage &&
//           lastMessage.content &&
//           lastMessage.content.toLowerCase().includes("resolved")
//         ) {
//           status = "Resolved";
//         }

//         return {
//           room_id: room.room_id,
//           participants: [
//             { id: sender.id, name: sender.name, role: "Buyer" },
//             { id: receiver.id, name: receiver.name, role: "Seller" },
//           ],
//           last_message: {
//             content: lastMessage?.content || "",
//             date: lastMessage?.timestamp,
//           },
//           messages_count: messages.length,
//           status,
//         };
//       })
//     );

//     // Filter out any nulls (conversations that were skipped)
//     const filteredConversations = conversations.filter(Boolean);

//     // Pagination metadata
//     const totalPages = Math.ceil(totalRooms / limitInt);

//     res.json({
//       success: true,
//       data: filteredConversations,
//       pagination: {
//         total: totalRooms,
//         page: pageInt,
//         limit: limitInt,
//         pages: totalPages,
//       },
//     });
//   } catch (error) {
//     console.error("Error in getAllConversations:", error);
//     next(error);
//   }
// };

// exports.getMessagesByRoomId = async (req, res, next) => {
//   try {
//     const { room_id } = req.params;

//     const messages = await Message.findAll({
//       where: { room_id },
//       include: [
//         { model: User, as: "sender", attributes: ["id", "name", "email"] },
//         { model: User, as: "receiver", attributes: ["id", "name", "email"] },
//       ],
//       order: [["timestamp", "ASC"]],
//     });

//     res.json({ success: true, data: messages });
//   } catch (error) {
//     console.error("Error in getMessagesByRoomId:", error);
//     next(error);
//   }
// };

// Update getAllQuotations

// GET /admin/messages/between?buyer_id=...&seller_id=...
exports.getAllConversations = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, buyer_id, seller_id } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offset = (pageInt - 1) * limitInt;

    // Build where clause for filtering by buyer and seller
    let whereClause = {};
    if (buyer_id && seller_id) {
      whereClause = {
        [Op.or]: [
          { sender_id: buyer_id, receiver_id: seller_id },
          { sender_id: seller_id, receiver_id: buyer_id },
        ],
      };
    }

    // Get all messages matching the filter
    const allMessages = await Message.findAll({
      where: whereClause,
      attributes: [
        [
          sequelize.fn(
            "LEAST",
            sequelize.col("sender_id"),
            sequelize.col("receiver_id")
          ),
          "user1",
        ],
        [
          sequelize.fn(
            "GREATEST",
            sequelize.col("sender_id"),
            sequelize.col("receiver_id")
          ),
          "user2",
        ],
        [sequelize.fn("MAX", sequelize.col("timestamp")), "last_message_time"],
      ],
      group: ["user1", "user2"],
      order: [[sequelize.fn("MAX", sequelize.col("timestamp")), "DESC"]],
      raw: true,
    });

    // Pagination on the grouped conversations
    const paginatedConversations = allMessages.slice(offset, offset + limitInt);

    // For each unique pair, get conversation summary
    const conversations = await Promise.all(
      paginatedConversations.map(async (pair) => {
        // Get all messages for this pair (both directions)
        const messages = await Message.findAll({
          where: {
            [Op.or]: [
              { sender_id: pair.user1, receiver_id: pair.user2 },
              { sender_id: pair.user2, receiver_id: pair.user1 },
            ],
          },
          order: [["timestamp", "ASC"]],
        });

        if (!messages.length) return null;

        // Get participants with type
        const user1 = await User.findByPk(pair.user1, {
          attributes: ["id", "name", "email", "type"],
        });
        const user2 = await User.findByPk(pair.user2, {
          attributes: ["id", "name", "email", "type"],
        });

        if (!user1 || !user2) return null;

        // Assign buyer and seller based on type
        let buyer, seller;
        if (user1.type === "buyer") {
          buyer = user1;
          seller = user2;
        } else if (user2.type === "buyer") {
          buyer = user2;
          seller = user1;
        } else {
          // If neither is a buyer, just assign as is
          buyer = user1;
          seller = user2;
        }

        // Get the last message
        const lastMessage = messages[messages.length - 1];
        const room_id = lastMessage?.room_id || messages[0]?.room_id;

        // Determine status (example logic, adjust as needed)
        let status = "Active";
        if (
          lastMessage &&
          lastMessage.content &&
          lastMessage.content.toLowerCase().includes("escalate")
        ) {
          status = "Escalated";
        } else if (
          lastMessage &&
          lastMessage.content &&
          lastMessage.content.toLowerCase().includes("resolved")
        ) {
          status = "Resolved";
        }

        return {
          room_id,
          participants: [
            {
              id: buyer.id,
              name: buyer.name,
              email: buyer.email,
              type: buyer.type,
            },
            {
              id: seller.id,
              name: seller.name,
              email: seller.email,
              type: seller.type,
            },
          ],
          last_message: {
            content: lastMessage?.content || "",
            date: lastMessage?.timestamp,
          },
          messages_count: messages.length,
          status,
        };
      })
    );

    // Filter out any nulls (conversations that were skipped)
    const filteredConversations = conversations.filter(Boolean);

    // Pagination metadata
    const totalConversations = allMessages.length;
    const totalPages = Math.ceil(totalConversations / limitInt);

    res.json({
      success: true,
      data: filteredConversations,
      pagination: {
        total: totalConversations,
        page: pageInt,
        limit: limitInt,
        pages: totalPages,
      },
    });
  } catch (error) {
    console.error("Error in getAllConversations:", error);
    next(error);
  }
};

exports.getMessagesBetweenBuyerAndSeller = async (req, res, next) => {
  try {
    const { buyer_id, seller_id } = req.query;

    if (!buyer_id || !seller_id) {
      return res.status(400).json({
        success: false,
        message: "buyer_id and seller_id are required",
      });
    }

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: buyer_id, receiver_id: seller_id },
          { sender_id: seller_id, receiver_id: buyer_id },
        ],
      },
      include: [
        { model: User, as: "sender", attributes: ["id", "name", "email"] },
        { model: User, as: "receiver", attributes: ["id", "name", "email"] },
      ],
      order: [["timestamp", "ASC"]],
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error("Error in getMessagesBetweenBuyerAndSeller:", error);
    next(error);
  }
};
exports.getAllQuotations = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = {};
    if (status) query.status = status;

    const quotations = await Quotation.findAndCountAll({
      where: query,
      include: [
        {
          model: User,
          as: "seller",
          attributes: ["id", "name", "company_name"],
        },
        {
          model: Enquiries,
          include: [
            {
              model: User,
              as: "enquiry_sellers",
              attributes: ["id", "name", "email"],
              through: { attributes: [] },
            },
            {
              model: User,
              as: "buyer",
              attributes: ["id", "name", "email"],
            },
          ],
        },
        {
          model: QuotationItems,
          attributes: [
            "id",
            "quotation_id",
            "enquiry_item_id",
            "status",
            "quoted_price",
            "delivery_time",
            "delivery_charges",
            "condition",
            "guarantee",
            "invoice_type",
            "remarks",
            "subtotal",
            "p_and_p",
            "discount",
            "grand_total",
            "is_free_delivery",
            "is_collection_only",
            "is_vat_exempt",
            "created_at",
            "updated_at",
          ],
          include: [
            {
              model: EnquiryItems,
              attributes: ["id", "product_type_id", "details", "image"],
              include: [
                {
                  model: ProductType,
                  attributes: ["id", "name"],
                },
              ],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      separate: true,
    });

    res.status(200).json({
      success: true,
      data: quotations.rows,
      pagination: {
        total: quotations.count,
        page: parseInt(page),
        pages: Math.ceil(quotations.count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error in getAllQuotations:", error);
    next(error);
  }
};

// Update getQuotationDetails
exports.getQuotationDetails = async (req, res, next) => {
  try {
    const quotation = await Quotation.findByPk(req.params.quotationId, {
      include: [
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
        {
          model: Enquiries,
          include: [
            {
              model: User,
              as: "enquiry_sellers",
              attributes: ["id", "name", "email"],
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    if (!quotation) {
      return next(createError(404, "Quotation not found"));
    }

    res.status(200).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    console.error("Error in getQuotationDetails:", error);
    next(error);
  }
};

// Update getQuotationsByEnquiry
exports.getQuotationsByEnquiry = async (req, res, next) => {
  try {
    const quotations = await Quotation.findAll({
      where: { enquiry_id: req.params.enquiryId },
      include: [
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: quotations,
    });
  } catch (error) {
    console.error("Error in getQuotationsByEnquiry:", error);
    next(error);
  }
};

// Update updateQuotationStatus
exports.updateQuotationStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const validStatuses = ["pending", "approved", "rejected"];

    if (!validStatuses.includes(status)) {
      return next(createError(400, "Invalid status"));
    }

    const quotation = await Quotation.findByPk(req.params.quotationId, {
      include: [
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
        {
          model: Enquiries,
        },
      ],
    });

    if (!quotation) {
      return next(createError(404, "Quotation not found"));
    }

    quotation.status = status;
    await quotation.save();

    // Send email notification
    await sendAdminNotification({
      to: quotation.User.email,
      type: "quotation_status",
      data: { status, remarks },
    });

    res.status(200).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    console.error("Error in updateQuotationStatus:", error);
    next(error);
  }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    // 1. Total Sellers & Buyers
    const [totalSellers, totalBuyers] = await Promise.all([
      User.count({ where: { type: "seller" } }),
      User.count({ where: { type: "buyer" } }),
    ]);

    // 2. Active Enquiries (status: 'open'), Open Tickets (feedback with status 'open')
    const [activeEnquiries, openTickets] = await Promise.all([
      Enquiries.count({ where: { status: "open" } }),
      Feedback.count({ where: { status: "open" } }),
    ]);

    // 3. Seller Verification
    const [pendingVerification, verifiedSellers, bannedSellers] =
      await Promise.all([
        User.count({ where: { type: "seller", is_verified: false } }),
        User.count({ where: { type: "seller", is_verified: true } }),
        User.count({ where: { type: "seller", status: "banned" } }),
      ]);

    // 4. Marketplace Activity (group by month for Enquiries, Quotations, Feedback as Tickets)
    const enquiriesByMonth = await Enquiries.findAll({
      attributes: [
        [sequelize.literal("EXTRACT(MONTH FROM created_at)"), "month"],
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: [sequelize.literal("EXTRACT(MONTH FROM created_at)")],
      raw: true,
    });

    const quotationsByMonth = await Quotation.findAll({
      attributes: [
        [sequelize.literal("EXTRACT(MONTH FROM created_at)"), "month"],
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: [sequelize.literal("EXTRACT(MONTH FROM created_at)")],
      raw: true,
    });

    const ticketsByMonth = await Feedback.findAll({
      attributes: [
        [sequelize.literal("EXTRACT(MONTH FROM created_at)"), "month"],
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      where: { status: "open" },
      group: [sequelize.literal("EXTRACT(MONTH FROM created_at)")],
      raw: true,
    });

    // 5. Recent Activity
    const recentSellers = await User.findAll({
      where: { type: "seller" },
      order: [["created_at", "DESC"]],
      limit: 1,
      raw: true,
    });

    const recentEnquiry = await Enquiries.findAll({
      order: [["created_at", "DESC"]],
      limit: 1,
      raw: true,
    });

    const recentQuotation = await Quotation.findAll({
      order: [["created_at", "DESC"]],
      limit: 1,
      raw: true,
    });

    const recentTicket = await Feedback.findAll({
      order: [["created_at", "DESC"]],
      limit: 1,
      raw: true,
    });

    const recentVerification = await User.findAll({
      where: { type: "seller", is_verified: true },
      order: [["created_at", "DESC"]],
      limit: 1,
      raw: true,
    });

    // 6. Top Sellers (manual merge of quote counts and user info)
    const sellerQuoteCounts = await Quotation.findAll({
      attributes: [
        "seller_id",
        [sequelize.fn("COUNT", sequelize.col("id")), "quotes_count"],
      ],
      group: ["seller_id"],
      order: [[sequelize.literal("quotes_count"), "DESC"]],
      limit: 4,
      raw: true,
    });

    const sellerIds = sellerQuoteCounts.map((s) => s.seller_id);
    const sellers = await User.findAll({
      where: { id: sellerIds },
      attributes: ["id", "name", "company_name"],
      raw: true,
    });

    const topSellers = sellerQuoteCounts.map((entry) => {
      const seller = sellers.find((s) => s.id === entry.seller_id);
      return {
        seller_id: entry.seller_id,
        quotes_count: parseInt(entry.quotes_count),
        name: seller?.name || null,
        company_name: seller?.company_name || null,
      };
    });

    // 7. System Alerts
    const systemAlerts = [];
    if (activeEnquiries > 400) {
      systemAlerts.push({
        type: "warning",
        message: "High enquiry volume",
        details:
          "Enquiry volume is higher than normal. Consider adding more staff.",
      });
    }
    if (pendingVerification > 20) {
      systemAlerts.push({
        type: "info",
        message: "Pending verifications",
        details: "There are pending seller verifications.",
      });
    }

    // 8. % Change Dummy Stats
    const percentChanges = {
      sellers: 12,
      buyers: 8,
      enquiries: 23,
      tickets: -5,
    };

    res.json({
      success: true,
      data: {
        totalSellers,
        totalBuyers,
        activeEnquiries,
        openTickets,
        percentChanges,
        marketplaceActivity: {
          enquiriesByMonth,
          quotationsByMonth,
          ticketsByMonth,
        },
        recentActivity: {
          recentSellers,
          recentEnquiry,
          recentQuotation,
          recentTicket,
          recentVerification,
        },
        sellerVerification: {
          pendingVerification,
          verifiedSellers,
          bannedSellers,
        },
        topSellers,
        systemAlerts,
      },
    });
  } catch (error) {
    console.error("Error in getDashboardStats:", error);
    next(error);
  }
};
