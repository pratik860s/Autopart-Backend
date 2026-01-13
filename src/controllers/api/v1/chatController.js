const Message = require("../../../models/message");
const Users = require("../../../models/user");
const { getReceiverSocketId, io } = require("../../../socket/chatSocket");
const { Op } = require("sequelize");
const { uploadToS3 } = require("../../../services/s3Service");

// Fetch all users
// const getUsersForSidebar = async (req, res) => {
//   try {
//     const loggedInUserId = req.user.id;
//     const loggedInUserRole = req.user.type;

//     const oppositeRole = loggedInUserRole === "buyer" ? "seller" : "buyer";

//     const users = await Users.findAll({
//       where: {
//         id: { [Op.ne]: loggedInUserId },
//         type: oppositeRole,
//       },
//       attributes: { exclude: ["password"] },
//     });

//     res.status(200).json(users);
//   } catch (error) {
//     console.error("Error in getUsersForSidebar:", error.message);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user.id;

    // Find all users who have sent or received messages with the logged-in user
    const conversations = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: loggedInUserId },
          { receiver_id: loggedInUserId },
        ],
      },
      attributes: ["sender_id", "receiver_id"],
    });

    // Extract unique user IDs from conversations
    const userIds = new Set();
    conversations.forEach((message) => {
      if (message.sender_id !== loggedInUserId) {
        userIds.add(message.sender_id);
      }
      if (message.receiver_id !== loggedInUserId) {
        userIds.add(message.receiver_id);
      }
    });

    // Fetch user details for the sidebar
    const users = await Users.findAll({
      where: {
        id: { [Op.in]: Array.from(userIds) },
      },
      attributes: { exclude: ["password"] },
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Fetch Messages between two users with Buyer-Seller validation
const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user.id;

    const senderRole = req.user.type;
    const receiver = await Users.findByPk(userToChatId);

    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    const validPair =
      (senderRole === "buyer" && receiver.type === "seller") ||
      (senderRole === "seller" && receiver.type === "buyer");

    if (!validPair) {
      return res
        .status(403)
        .json({ message: "Access denied: Only Buyer-Seller chats allowed" });
    }
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: myId, receiver_id: userToChatId },
          { sender_id: userToChatId, receiver_id: myId },
        ],
      },
      order: [["timestamp", "ASC"]],
    });
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send Message with optional image upload to S3
const sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user.id;

    const senderRole = req.user.type;
    const receiver = await Users.findByPk(receiverId);

    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const validPair =
      (senderRole === "buyer" && receiver.type === "seller") ||
      (senderRole === "seller" && receiver.type === "buyer");

    if (!validPair) {
      return res
        .status(403)
        .json({ message: "Chat allowed only between Buyer and Seller" });
    }

    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        uploadToS3(file.buffer, file.originalname, process.env.S3_BUCKET_NAME)
      );
      imageUrls = await Promise.all(uploadPromises);
    }

    if (!text && imageUrls.length === 0) {
      return res
        .status(400)
        .json({ message: "Message must contain text or image." });
    }
    const timestamp = new Date().toISOString();

    const newMessage = await Message.create({
      room_id: `${senderId}_${receiverId}`,
      sender_id: senderId,
      receiver_id: receiverId,
      content: text || null,
      image_url: imageUrls.length > 0 ? imageUrls : null,
      timestamp,
    });

    // Ensure response timestamp is ISO 8601 UTC
    const messageWithIsoTimestamp = {
      ...newMessage.toJSON(),
      timestamp: newMessage.timestamp
        ? new Date(newMessage.timestamp).toISOString()
        : timestamp,
    };

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io().to(receiverSocketId).emit("newMessage", messageWithIsoTimestamp);
    }

    res.status(201).json(messageWithIsoTimestamp);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Export all functions
module.exports = {
  getUsersForSidebar,
  getMessages,
  sendMessage,
};
