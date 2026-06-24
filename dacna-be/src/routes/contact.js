import express from "express";
import {
  createContactMessage,
  listContactMessages,
  getUserContactMessages,
  replyToMessage,
  updateMessageStatus,
} from "../controllers/contactController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// POST /api/contact/messages - public contact form
router.post("/messages", createContactMessage);

// User route - get their own contact messages
router.get("/my-messages", authMiddleware, getUserContactMessages);

// Admin routes
router.get(
  "/admin/messages",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  listContactMessages
);
router.patch(
  "/admin/messages/:id/reply",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  replyToMessage
);
router.patch(
  "/admin/messages/:id/status",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  updateMessageStatus
);

export default router;
