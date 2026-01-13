const socketIo = require("socket.io");
const Message = require("../models/message");
const { uploadToS3 } = require("../services/s3Service");

const onlineUsers = new Map();
let io = null;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    onlineUsers.set(userId, socket.id);

    socket.on(
      "sendMessage",
      async ({
        receiverId,
        senderId,
        message,
        imageUrl,
        buyerId,
        sellerId,
      }) => {
        try {
          let uploadedImageUrls = [];
          if (Array.isArray(imageUrl) && imageUrl.length > 0) {
            uploadedImageUrls = await Promise.all(
              imageUrl.map(async (base64, idx) => {
                // Only handle base64 strings
                const matches = base64.match(/^data:(.+);base64,(.+)$/);
                if (!matches) return null;
                const mimeType = matches[1];
                const ext = mimeType.split("/")[1] || "jpg";
                const buffer = Buffer.from(matches[2], "base64");
                const fileName = `chat-${senderId}-${Date.now()}-${idx}.${ext}`;
                return await uploadToS3(
                  buffer,
                  fileName,
                  process.env.S3_BUCKET_NAME
                );
              })
            );
            uploadedImageUrls = uploadedImageUrls.filter(Boolean);
          }

          // Always use buyerId and sellerId for roomId if provided
          let roomId;
          if (buyerId && sellerId) {
            roomId = `${buyerId}_${sellerId}`;
          } else {
            // fallback to old logic if not provided
            roomId = `${senderId}_${receiverId}`;
          }

          const newMessage = await Message.create({
            room_id: roomId,
            sender_id: senderId,
            receiver_id: receiverId,
            content: message,
            image_url: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
            timestamp: new Date().toISOString(),
          });

          const receiverSocketId = onlineUsers.get(receiverId);
          const senderSocketId = onlineUsers.get(senderId);

          if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
          }
          if (senderSocketId) {
            io.to(senderSocketId).emit("newMessage", newMessage);
          }
        } catch (err) {
          console.error("Message saving failed:", err);
        }
      }
    );

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
    });
  });
};

const getReceiverSocketId = (receiverId) => {
  return onlineUsers.get(receiverId);
};

// Export both
module.exports = {
  initSocket,
  getReceiverSocketId,
  io: () => io, // Export io as a function to avoid circular dependency
};
