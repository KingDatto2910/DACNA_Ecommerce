import { pool } from "../db.js";

// Check if user has an active or pending chat session
export async function getUserActiveSession(userId) {
  const [rows] = await pool.execute(
    `SELECT id, status FROM chat_sessions 
     WHERE user_id = ? AND status IN ('pending','active') LIMIT 1`,
    [userId]
  );

  return rows.length > 0 ? rows[0] : null;
}

// Create a new chat session request
export async function createChatSession(userId) {
  const [result] = await pool.execute(
    `INSERT INTO chat_sessions (user_id, status, created_at) VALUES (?, 'pending', NOW())`,
    [userId]
  );

  return result.insertId;
}

// Add a system message to chat session
export async function addSystemMessage(sessionId, message) {
  const [result] = await pool.execute(
    `INSERT INTO chat_messages (session_id, sender_type, sender_name, message)
     VALUES (?, 'system', 'System', ?)`,
    [sessionId, message]
  );

  return result.insertId;
}

// Get chat session by ID
export async function getChatSession(sessionId) {
  const [rows] = await pool.execute(
    `SELECT * FROM chat_sessions WHERE id = ?`,
    [sessionId]
  );

  return rows.length > 0 ? rows[0] : null;
}

// Get all pending chat requests
export async function getPendingRequests() {
  const [rows] = await pool.execute(
    `SELECT cs.*, u.username as user_name, u.email as user_email
     FROM chat_sessions cs
     LEFT JOIN users u ON cs.user_id = u.id
     WHERE cs.status = 'pending'
     ORDER BY cs.created_at ASC`
  );

  return rows;
}

// Get all active chat sessions
export async function getActiveSessions() {
  const [rows] = await pool.execute(
    `SELECT cs.*, 
            u.username as user_name, 
            u.email as user_email,
            (SELECT COUNT(*) FROM chat_messages WHERE session_id = cs.id AND is_read = 0 AND sender_type = 'user') as unread_count
     FROM chat_sessions cs
     LEFT JOIN users u ON cs.user_id = u.id
     WHERE cs.status = 'active'
     ORDER BY cs.accepted_at DESC`
  );

  return rows;
}

// Accept a chat request (admin action)
export async function acceptChatRequest(sessionId, adminId, adminName) {
  const [result] = await pool.execute(
    `UPDATE chat_sessions 
     SET status = 'active', 
         admin_id = ?, 
         admin_name = ?,
         accepted_at = NOW(),
         expires_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE)
     WHERE id = ? AND status = 'pending'`,
    [adminId, adminName, sessionId]
  );

  return result.affectedRows;
}

// Reject a chat request (admin action)
export async function rejectChatRequest(sessionId) {
  const [result] = await pool.execute(
    `UPDATE chat_sessions 
     SET status = 'rejected', ended_at = NOW()
     WHERE id = ? AND status = 'pending'`,
    [sessionId]
  );

  return result.affectedRows;
}

// Close a chat session
export async function closeChatSession(sessionId) {
  const [result] = await pool.execute(
    `UPDATE chat_sessions 
     SET status = 'ended', ended_at = NOW()
     WHERE id = ? AND status = 'active'`,
    [sessionId]
  );

  return result.affectedRows;
}

// Get chat messages for a session
export async function getChatMessages(sessionId) {
  const [rows] = await pool.execute(
    `SELECT * FROM chat_messages 
     WHERE session_id = ? 
     ORDER BY created_at ASC`,
    [sessionId]
  );

  return rows;
}

// Add a message to chat session
export async function addChatMessage(
  sessionId,
  senderType,
  senderName,
  message,
  senderId = null
) {
  const [result] = await pool.execute(
    `INSERT INTO chat_messages (session_id, sender_type, sender_name, message, sender_id)
     VALUES (?, ?, ?, ?, ?)`,
    [sessionId, senderType, senderName, message, senderId]
  );

  return result.insertId;
}

// Mark messages as read
export async function markMessagesAsRead(sessionId, senderType) {
  const [result] = await pool.execute(
    `UPDATE chat_messages 
     SET is_read = 1 
     WHERE session_id = ? AND sender_type = ?`,
    [sessionId, senderType]
  );

  return result.affectedRows;
}

// Get unread message count for session
export async function getUnreadCount(sessionId) {
  const [result] = await pool.execute(
    `SELECT COUNT(*) as count FROM chat_messages 
     WHERE session_id = ? AND is_read = 0`,
    [sessionId]
  );

  return result[0].count;
}

// End chat session (user closes)
export async function endUserSession(sessionId, userId) {
  const [result] = await pool.execute(
    `UPDATE chat_sessions 
     SET status = 'ended', ended_at = NOW()
     WHERE id = ? AND user_id = ? AND status = 'active'`,
    [sessionId, userId]
  );

  return result.affectedRows;
}
