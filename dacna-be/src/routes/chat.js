import express from "express";
import {
  requestChatSession,
  getPendingChatRequests,
  getActiveChatSessions,
  acceptChatRequest,
  rejectChatRequest,
  endChatSession,
  getChatMessages,
  sendChatMessage,
  getUserActiveSession,
} from "../controllers/chatController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// User routes (authenticated only)
router.post("/request", authMiddleware, requestChatSession); // Request new chat
router.get("/my-session", authMiddleware, getUserActiveSession); // Get user's active session
router.get("/:sessionId/messages", authMiddleware, getChatMessages); // Get messages
router.post("/:sessionId/messages", authMiddleware, sendChatMessage); // Send message

// Admin routes
router.get(
  "/admin/pending",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  getPendingChatRequests
);
router.get(
  "/admin/active",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  getActiveChatSessions
);
router.post(
  "/admin/:sessionId/accept",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  acceptChatRequest
);
router.post(
  "/admin/:sessionId/reject",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  rejectChatRequest
);
router.post(
  "/admin/:sessionId/end",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  endChatSession
);

export default router;
