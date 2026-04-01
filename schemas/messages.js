const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "From user is required"],
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "To user is required"],
    },
    messageContent: {
      type: {
        type: String,
        enum: ["file", "text"],
        required: [true, "Message type is required"],
      },
      text: {
        type: String,
        required: [true, "Message text is required"],
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
);

module.exports = mongoose.model("Message", messageSchema);
