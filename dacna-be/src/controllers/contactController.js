import * as Contact from "../models/contactModel.js";

export async function createContactMessage(req, res) {
  try {
    const { name, email, message, subject } = req.body || {};
    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ ok: false, message: "Missing required fields" });
    }

    // Get user_id if authenticated (from authMiddleware)
    const userId = req.user?.id ?? null;

    await Contact.createContactMessage(userId, name, email, subject, message);

    return res.json({ ok: true, message: "Message received" });
  } catch (err) {
    console.error("Contact message error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

// Admin: Get all contact messages with pagination and sorting
export async function listContactMessages(req, res) {
  try {
    const result = await Contact.listMessages(req.query);

    return res.json({
      ok: true,
      messages: result.messages,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    console.error("List messages error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

// User: Get their own contact messages
export async function getUserContactMessages(req, res) {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    console.log("\n========== GET USER MESSAGES START ==========");
    console.log("🔍 getUserContactMessages called");
    console.log("userId:", userId, typeof userId);
    console.log("userEmail:", userEmail, typeof userEmail);
    console.log("req.user:", JSON.stringify(req.user, null, 2));

    if (!userId || !userEmail) {
      console.log("❌ Not authenticated: userId=" + userId + ", email=" + userEmail);
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    console.log("✅ User authenticated, calling Contact.getUserMessages...");
    const result = await Contact.getUserMessages(userId, userEmail, req.query);

    console.log("✅ Messages retrieved successfully!");
    console.log("Result structure:", {
      messagesCount: result.messages?.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
    console.log("Messages data:", JSON.stringify(result.messages, null, 2));
    console.log("========== GET USER MESSAGES END (SUCCESS) ==========\n");

    return res.json({
      ok: true,
      messages: result.messages,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    console.error("========== GET USER MESSAGES END (ERROR) ==========");
    console.error("❌ Get user messages error:", err.message);
    console.error("Error stack:", err.stack);
    console.error("Full error object:", JSON.stringify({
      message: err.message,
      code: err.code,
      errno: err.errno,
      sql: err.sql,
      sqlState: err.sqlState,
    }, null, 2));

    return res.status(500).json({
      ok: false,
      message: err.message || "Server error",
      error: err.message,
      details: {
        code: err.code,
        errno: err.errno,
      }
    });
  }
}

// Admin: Add reply to a message and mark as read
export async function replyToMessage(req, res) {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply) {
      return res
        .status(400)
        .json({ ok: false, message: "Reply text required" });
    }

    await Contact.replyToMessage(id, reply);

    return res.json({ ok: true, message: "Reply saved" });
  } catch (err) {
    console.error("Reply error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

// Admin: Update message status
export async function updateMessageStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await Contact.updateMessageStatus(id, status);

    return res.json({ ok: true, message: "Status updated" });
  } catch (err) {
    console.error("Update status error:", err);
    if (err.message.includes("Invalid status")) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
