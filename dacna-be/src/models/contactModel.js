import { pool } from "../db.js";

// Ensure table exists (lightweight safety)
export async function ensureTableExists() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NULL,
      message TEXT NOT NULL,
      status ENUM('new','read','archived') DEFAULT 'new',
      admin_reply TEXT NULL,
      replied_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at DESC),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

// Create a new contact message
export async function createContactMessage(
  userId,
  name,
  email,
  subject,
  message
) {
  await ensureTableExists();

  const [result] = await pool.execute(
    `INSERT INTO contact_messages (user_id, name, email, subject, message) VALUES (?, ?, ?, ?, ?)`,
    [userId || null, name, email, subject || null, message]
  );

  return result.insertId;
}

// List all contact messages with pagination and filtering
export async function listMessages(filters = {}) {
  const {
    status,
    page = 1,
    limit = 20,
    sort_by = "created_at",
    sort_dir = "DESC",
  } = filters;
  // Defensive parsing to avoid NaN blowing up LIMIT/OFFSET binding
  const parsedPage = Number.isFinite(Number(page)) ? Number(page) : 1;
  const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
  const pageNum = Math.max(1, parseInt(parsedPage, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(parsedLimit, 10) || 20));
  const offset = Math.max(0, (pageNum - 1) * limitNum);

  let whereClause = "";
  const params = [];

  if (status && ["new", "read", "archived"].includes(status)) {
    whereClause = "WHERE cm.status = ?";
    params.push(status);
  }

  const allowedSort = ["created_at", "name", "status"];
  const sortBy = allowedSort.includes(sort_by) ? sort_by : "created_at";
  const sortColumn = `cm.${sortBy}`;
  const sortDirection =
    String(sort_dir).toUpperCase() === "ASC" ? "ASC" : "DESC";

  // Inline LIMIT/OFFSET after sanitization to avoid prepared-statement arg issues
  const query = `
    SELECT cm.id, cm.user_id, cm.name, cm.email, cm.subject, cm.message, cm.status, 
           cm.admin_reply, cm.created_at, cm.replied_at,
           u.username as user_name, u.roles as user_role
    FROM contact_messages cm
    LEFT JOIN users u ON cm.user_id = u.id
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT ${limitNum} OFFSET ${offset}
  `;

  const [rows] = await pool.execute(query, params);

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM contact_messages cm ${whereClause}`;
  const countParams = status ? [status] : [];

  const [countResult] = await pool.execute(countQuery, countParams);

  return {
    messages: rows,
    total: countResult[0].total,
    page: pageNum,
    limit: limitNum,
  };
}

// Get messages for a specific user (user_id or email match)
export async function getUserMessages(userId, userEmail, filters = {}) {
  console.log("\n--- getUserMessages MODEL START ---");
  console.log("Input params:", { userId, userEmail, filters });

  const { page = 1, limit = 20 } = filters;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  console.log("Pagination:", { pageNum, limitNum, offset });

  // Validate required parameters
  if (!userEmail && !userId) {
    throw new Error("Email or UserID is required to fetch messages");
  }

  const numUserId = userId ? parseInt(userId, 10) : null;
  const strEmail = userEmail ? String(userEmail).trim() : null;

  console.log("Processed params:", { numUserId, strEmail });

  let rows, countResult;

  if (numUserId) {
    // User is authenticated with ID
    const whereClause = strEmail
      ? `user_id = ? OR email = ?`
      : `user_id = ?`;
    const whereParams = strEmail ? [numUserId, strEmail] : [numUserId];

    console.log("📨 Query 1 - Get Messages:");
    console.log(`   WHERE: ${whereClause}`);
    console.log(`   WHERE PARAMS: [${whereParams.join(', ')}]`);
    console.log(`   LIMIT: ${limitNum}, OFFSET: ${offset}`);

    try {
      // Build query with fixed values for LIMIT/OFFSET to avoid prepared statement issues
      const query = `SELECT id, name, email, subject, message, status, admin_reply, created_at, replied_at
         FROM contact_messages
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT ${limitNum} OFFSET ${offset}`;
      [rows] = await pool.execute(query, whereParams);
      console.log(`✅ Query 1 SUCCESS: Found ${rows.length} rows`);
      console.log(`   Row data:`, JSON.stringify(rows, null, 2));
    } catch (err) {
      console.error(`❌ Query 1 FAILED:`, err.message);
      console.error(`   WHERE params were:`, whereParams);
      throw err;
    }

    console.log("📊 Query 2 - Get Count:");
    console.log(`   WHERE: ${whereClause}`);
    console.log(`   WHERE PARAMS: [${whereParams.join(', ')}]`);

    try {
      [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM contact_messages WHERE ${whereClause}`,
        whereParams
      );
      console.log(`✅ Query 2 SUCCESS: Total = ${countResult[0].total}`);
    } catch (err) {
      console.error(`❌ Query 2 FAILED:`, err.message);
      throw err;
    }
  } else if (strEmail) {
    // User not authenticated by ID
    console.log("📨 Query 1 - Get Messages (Email only):");
    console.log(`   WHERE: email = ?`);
    console.log(`   WHERE PARAMS: ['${strEmail}']`);
    console.log(`   LIMIT: ${limitNum}, OFFSET: ${offset}`);

    try {
      // Build query with fixed values for LIMIT/OFFSET to avoid prepared statement issues
      const query = `SELECT id, name, email, subject, message, status, admin_reply, created_at, replied_at
         FROM contact_messages
         WHERE email = ?
         ORDER BY created_at DESC
         LIMIT ${limitNum} OFFSET ${offset}`;
      [rows] = await pool.execute(query, [strEmail]);
      console.log(`✅ Query 1 SUCCESS: Found ${rows.length} rows`);
    } catch (err) {
      console.error(`❌ Query 1 FAILED:`, err.message);
      console.error(`   WHERE params were: ['${strEmail}']`);
      throw err;
    }

    console.log("📊 Query 2 - Get Count (Email only):");
    console.log(`   WHERE PARAMS: ['${strEmail}']`);
    try {
      [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM contact_messages WHERE email = ?`,
        [strEmail]
      );
      console.log(`✅ Query 2 SUCCESS: Total = ${countResult[0].total}`);
    } catch (err) {
      console.error(`❌ Query 2 FAILED:`, err.message);
      throw err;
    }
  } else {
    throw new Error("Invalid parameters for getUserMessages");
  }

  const result = {
    messages: rows,
    total: countResult[0].total,
    page: pageNum,
    limit: limitNum,
  };

  console.log("📦 Final result:", JSON.stringify(result, null, 2));
  console.log("--- getUserMessages MODEL END ---\n");

  return result;
}

// Reply to a message and mark as read
export async function replyToMessage(messageId, replyText) {
  const [result] = await pool.execute(
    `UPDATE contact_messages 
     SET admin_reply = ?, replied_at = NOW(), status = 'read' 
     WHERE id = ?`,
    [replyText, messageId]
  );

  return result.affectedRows;
}

// Update message status
export async function updateMessageStatus(messageId, status) {
  if (!["new", "read", "archived"].includes(status)) {
    throw new Error("Invalid status");
  }

  const [result] = await pool.execute(
    `UPDATE contact_messages SET status = ? WHERE id = ?`,
    [status, messageId]
  );

  return result.affectedRows;
}
