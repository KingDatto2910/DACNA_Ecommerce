import * as Chat from "../models/chatModel.js";
import { getIO } from "../socket.js";

// User: Request a chat session
export async function requestChatSession(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }
    const userId = req.user.id;

    // Check if user already has an active or pending session
    const existing = await Chat.getUserActiveSession(userId);
    if (existing) {
      return res.json({
        ok: true,
        session: existing,
        message: "Existing session",
      });
    }

    // Create new chat request
    const sessionId = await Chat.createChatSession(userId);
    await Chat.addSystemMessage(
      sessionId,
      "Chat request sent. Waiting for admin to accept..."
    );

    const session = await Chat.getChatSession(sessionId);

    // Emit pending session creation (admin can refresh list)
    getIO()?.emit("session_update", {
      type: "pending_created",
      session: session,
    });
    return res.json({
      ok: true,
      session: session,
      message: "Chat request sent",
    });
  } catch (err) {
    console.error("Request chat error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

// Admin: Get all pending chat requests
export async function getPendingChatRequests(req, res) {
  try {
    const requests = await Chat.getPendingRequests();
    return res.json({ ok: true, requests });
  } catch (err) {
    console.error("Get pending requests error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

// Admin: Get all active chat sessions
export async function getActiveChatSessions(req, res) {
  try {
    const sessions = await Chat.getActiveSessions();
    return res.json({ ok: true, sessions });
  } catch (err) {
    console.error("Get active sessions error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

// Admin: Accept chat request
export async function acceptChatRequest(req, res) {
  try {
    const { sessionId } = req.params;
    const adminId = req.user.id;
    const adminName = req.user.username || req.user.name;

    // Update session
    await Chat.acceptChatRequest(sessionId, adminId, adminName);

    // Add system message and emit events
    const msgId = await Chat.addSystemMessage(
      sessionId,
      `Your request has been accepted. You're chatting with ${adminName}.`
    );

    const session = await Chat.getChatSession(sessionId);
    const messages = await Chat.getChatMessages(sessionId);

    getIO()
      ?.to(`session_${sessionId}`)
      .emit("session_update", { type: "accepted", session });
    getIO()
      ?.to(`session_${sessionId}`)
      .emit("message", messages[messages.length - 1]);
    getIO()?.emit("session_update", {
      type: "accepted_admin",
      session,
    });

    return res.json({ ok: true, message: "Chat accepted" });
  } catch (err) {
    console.error("Accept chat error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

// Admin: Reject chat request
export async function rejectChatRequest(req, res) {
  try {
    const { sessionId } = req.params;

    await Chat.rejectChatRequest(sessionId);

    // Add system message and emit events
    await Chat.addSystemMessage(
      sessionId,
      "Your chat request was not accepted. Please try contact form or call support."
    );

    const session = await Chat.getChatSession(sessionId);
    const messages = await Chat.getChatMessages(sessionId);

    getIO()
      ?.to(`session_${sessionId}`)
      .emit("session_update", { type: "rejected", session });
    getIO()
      ?.to(`session_${sessionId}`)
      .emit("message", messages[messages.length - 1]);
    getIO()?.emit("session_update", {
      type: "rejected_admin",
      session,
    });

    return res.json({ ok: true, message: "Chat rejected" });
  } catch (err) {
    console.error("Reject chat error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

// Admin: End chat session
export async function endChatSession(req, res) {
  try {
    const { sessionId } = req.params;

    const affected = await Chat.closeChatSession(+sessionId);
    if (!affected) {
      return res
        .status(400)
        .json({ ok: false, message: "Cannot end chat session" });
    }
    const session = await Chat.getChatSession(+sessionId);

    // Emit socket event to notify participants
    const io = getIO();
    io.to(`chat_${sessionId}`).emit("chat:ended", { sessionId: +sessionId });

    res.json({ ok: true, data: { ...session, status: "ended" } });
  } catch (err) {
    console.error("End chat error:", err);
    res.status(500).json({ ok: false, message: err.message || "Internal error" });
  }
}

// Get chat messages for a session
export async function getChatMessages(req, res) {
  try {
    const { sessionId } = req.params;
    const isAdmin = req.user?.role === "admin" || req.user?.role === "staff";

    // Verify access
    if (!isAdmin) {
      const session = await Chat.getChatSession(sessionId);
      if (!session) {
        return res
          .status(404)
          .json({ ok: false, message: "Session not found" });
      }
      if (
        req.user?.id !== session.user_id &&
        req.user?.email !== session.guest_email
      ) {
        return res.status(403).json({ ok: false, message: "Access denied" });
      }
    }

    const messages = await Chat.getChatMessages(sessionId);

    // Mark admin messages as read if user is viewing
    if (!isAdmin) {
      await Chat.markMessagesAsRead(sessionId, "admin");
    }

    return res.json({ ok: true, messages });
  } catch (err) {
    console.error("Get messages error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

// Send a message
export async function sendChatMessage(req, res) {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    const isAdmin = req.user?.role === "admin" || req.user?.role === "staff";

    if (!message || !message.trim()) {
      return res
        .status(400)
        .json({ ok: false, message: "Message cannot be empty" });
    }

    // Get session
    const session = await Chat.getChatSession(sessionId);
    if (!session) {
      return res.status(404).json({ ok: false, message: "Session not found" });
    }

    if (session.status !== "active") {
      return res
        .status(400)
        .json({ ok: false, message: "Chat session is not active" });
    }

    const senderType = isAdmin ? "admin" : "user";
    const senderId = req.user?.id ?? null;
    const senderName =
      req.user?.username || req.user?.name || session.guest_name;

    await Chat.addChatMessage(
      sessionId,
      senderType,
      senderName,
      message,
      senderId
    );

    const messages = await Chat.getChatMessages(sessionId);
    const lastMessage = messages[messages.length - 1];

    getIO()?.to(`session_${sessionId}`).emit("message", lastMessage);

    // Mark user messages as read if admin is sending
    if (isAdmin) {
      await Chat.markMessagesAsRead(sessionId, "user");
    }

    return res.json({ ok: true, message: "Message sent" });
  } catch (err) {
    console.error("Send message error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

// User: Get their active session
export async function getUserActiveSession(req, res) {
  try {
    if (!req.user?.id) {
      return res
        .status(401)
        .json({ ok: false, session: null, message: "Unauthorized" });
    }
    const userId = req.user.id;

    const session = await Chat.getUserActiveSession(userId);

    return res.json({ ok: true, session: session || null });
  } catch (err) {
    console.error("Get user session error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
