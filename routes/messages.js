var express = require("express");
var router = express.Router();
let messageModel = require("../schemas/messages");
let userModel = require("../schemas/users");
let { CheckLogin } = require("../utils/authHandler");
let mongoose = require("mongoose");

// GET "/" - Lấy message cuối cùng của mỗi user mà user hiện tại nhắn tin hoặc user khác nhắn cho user hiện tại
router.get("/", CheckLogin, async function (req, res, next) {
  try {
    let currentUserId = req.user._id;

    // Lấy tất cả message của user hiện tại (sắp xếp từ mới nhất)
    const messages = await messageModel
      .find({
        $or: [
          { from: currentUserId, isDeleted: false },
          { to: currentUserId, isDeleted: false },
        ],
      })
      .populate("from", "username email fullName avatarUrl")
      .populate("to", "username email fullName avatarUrl")
      .sort({ createdAt: -1 });

    // Tạo object để lưu message cuối cùng của mỗi user
    const conversationMap = {};

    messages.forEach((message) => {
      // Xác định userID đối phương
      const otherUserId =
        message.from._id.toString() === currentUserId.toString()
          ? message.to._id.toString()
          : message.from._id.toString();

      // Nếu chưa có conversation với user này, thêm vào
      if (!conversationMap[otherUserId]) {
        conversationMap[otherUserId] = {
          otherUserId: otherUserId,
          userInfo:
            message.from._id.toString() === currentUserId.toString()
              ? message.to
              : message.from,
          lastMessage: message,
        };
      }
    });

    // Chuyển object thành array
    const conversations = Object.values(conversationMap);

    res.send({
      success: true,
      data: conversations,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// GET "/:userID" - Lấy toàn bộ message giữa user hiện tại và userID
router.get("/:userID", CheckLogin, async function (req, res, next) {
  try {
    let currentUserId = req.user._id;
    let targetUserId = req.params.userID;

    // Kiểm tra userId hợp lệ
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Lấy tất cả message giữa 2 user
    const messages = await messageModel
      .find({
        isDeleted: false,
        $or: [
          { from: currentUserId, to: targetUserId },
          { from: targetUserId, to: currentUserId },
        ],
      })
      .populate("from", "username email fullName avatarUrl")
      .populate("to", "username email fullName avatarUrl")
      .sort({ createdAt: 1 });

    res.send({
      success: true,
      data: messages,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// POST "/" - Gửi message
router.post("/", CheckLogin, async function (req, res, next) {
  try {
    let currentUserId = req.user._id;
    let { to, messageType, messageText, filePath } = req.body;

    // Validate input
    if (!to) {
      return res.status(400).send({
        success: false,
        message: "Recipient user ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(to)) {
      return res.status(400).send({
        success: false,
        message: "Invalid recipient user ID",
      });
    }

    // Kiểm tra CurrentUserId không được gửi cho chính nó
    if (currentUserId.toString() === to) {
      return res.status(400).send({
        success: false,
        message: "Cannot send message to yourself",
      });
    }

    // Xử lý message type
    let messageContent = {};

    if (messageType === "file") {
      if (!filePath) {
        return res.status(400).send({
          success: false,
          message: "File path is required for file type message",
        });
      }
      messageContent = {
        type: "file",
        text: filePath,
      };
    } else if (messageType === "text") {
      if (!messageText) {
        return res.status(400).send({
          success: false,
          message: "Message text is required for text type message",
        });
      }
      messageContent = {
        type: "text",
        text: messageText,
      };
    } else {
      return res.status(400).send({
        success: false,
        message: "Message type must be 'file' or 'text'",
      });
    }

    // Tạo message mới
    const newMessage = await messageModel.create({
      from: currentUserId,
      to: to,
      messageContent: messageContent,
      isDeleted: false,
    });

    // Populate user information
    const populatedMessage = await newMessage.populate([
      { path: "from", select: "username email fullName avatarUrl" },
      { path: "to", select: "username email fullName avatarUrl" },
    ]);

    res.status(201).send({
      success: true,
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
