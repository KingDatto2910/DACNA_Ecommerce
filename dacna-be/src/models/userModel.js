import { pool } from "../db.js";

/** Create new user with customer role */
export async function createUser({ username, email, pw, phone }) {
  const [result] = await pool.execute(
    `INSERT INTO Users (username, email, phone, pw, roles, created_at, updated_at)
     VALUES (?, LOWER(?), ?, ?, 'customer', NOW(), NOW())`,
    [username, email, phone, pw]
  );
  return result.insertId;
}

/** Find user by username or email (case-insensitive) */
export async function findUserByUsernameOrEmail(value) {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1",
    [value, value]
  );
  return rows.length ? rows[0] : null;
}

/** Get current user's profile by ID */
export async function getUserProfile(userId) {
  const [rows] = await pool.execute(
    `SELECT id, username, email, phone, roles, verified, 
            full_name, address_street, address_district, address_ward, address_city, avatar_url,
            created_at, updated_at
     FROM users WHERE id = ?`,
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Update current user's profile */
export async function updateUserProfile(userId, updates) {
  const {
    username,
    phone,
    full_name,
    address_street,
    address_district,
    address_ward,
    address_city,
    avatar_url,
  } = updates;

  // Build dynamic UPDATE query for provided fields only
  const updateFields = [];
  const params = [];

  if (username !== undefined) {
    updateFields.push("username = ?");
    params.push(username);
  }
  if (phone !== undefined) {
    updateFields.push("phone = ?");
    params.push(phone || null);
  }
  if (full_name !== undefined) {
    updateFields.push("full_name = ?");
    params.push(full_name || null);
  }
  if (address_street !== undefined) {
    updateFields.push("address_street = ?");
    params.push(address_street || null);
  }
  if (address_district !== undefined) {
    updateFields.push("address_district = ?");
    params.push(address_district || null);
  }
  if (address_ward !== undefined) {
    updateFields.push("address_ward = ?");
    params.push(address_ward || null);
  }
  if (address_city !== undefined) {
    updateFields.push("address_city = ?");
    params.push(address_city || null);
  }
  if (avatar_url !== undefined) {
    updateFields.push("avatar_url = ?");
    params.push(avatar_url || null);
  }

  if (updateFields.length === 0) {
    return false; // No fields to update
  }

  params.push(userId);
  const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
  const [result] = await pool.execute(query, params);
  return result.affectedRows > 0;
}

/** Create a new user (admin operation) */
export async function createUserAdmin({
  username,
  email,
  pw,
  roles = "customer",
  verified = true,
  phone,
  full_name,
}) {
  const [result] = await pool.execute(
    `INSERT INTO users (username, email, pw, roles, verified, auth_provider, phone, full_name)
     VALUES (?, ?, ?, ?, ?, 'local', ?, ?)`,
    [
      username,
      email,
      pw,
      roles,
      verified ? 1 : 0,
      phone || null,
      full_name || null,
    ]
  );
  return result.insertId;
}

/** List all users with filters and pagination (admin) */
export async function listAllUsers(filters = {}) {
  const {
    role,
    search,
    page = 1,
    limit = 20,
    verified,
    sort_by,
    sort_dir,
  } = filters;

  const whereClauses = [];
  const params = [];

  if (role) {
    whereClauses.push("roles = ?");
    params.push(role);
  }

  if (verified !== undefined) {
    whereClauses.push("verified = ?");
    params.push(verified === "true" ? 1 : 0);
  }

  if (search) {
    whereClauses.push("(username LIKE ? OR email LIKE ? OR full_name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  let whereSQL = "";
  if (whereClauses.length > 0) {
    whereSQL = "WHERE " + whereClauses.join(" AND ");
  }

  // Get total count
  const countSQL = `SELECT COUNT(*) as total FROM users ${whereSQL}`;
  const [countRows] =
    whereClauses.length > 0
      ? await pool.execute(countSQL, params)
      : await pool.query(countSQL);
  const total = countRows[0].total;

  // Sorting whitelist
  const allowedSort = {
    id: "id",
    username: "username",
    email: "email",
    roles: "roles",
    verified: "verified",
    created_at: "created_at",
  };
  const column = allowedSort[String(sort_by)] || "created_at";
  const direction = String(sort_dir).toUpperCase() === "ASC" ? "ASC" : "DESC";

  // Get paginated results
  const offset = (page - 1) * limit;
  let rows;
  if (whereClauses.length > 0) {
    const dataSQL = `
      SELECT id, username, email, phone, roles, verified, full_name, 
             address_city, avatar_url, created_at, updated_at
      FROM users
      ${whereSQL}
      ORDER BY ${column} ${direction}
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;
    [rows] = await pool.execute(dataSQL, params);
  } else {
    const dataSQL = `
      SELECT id, username, email, phone, roles, verified, full_name, 
             address_city, avatar_url, created_at, updated_at
      FROM users
      ORDER BY ${column} ${direction}
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;
    [rows] = await pool.query(dataSQL);
  }

  return {
    rows,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
  };
}

/** Get user details by ID (admin) */
export async function getUserById(userId) {
  const [rows] = await pool.execute(
    `SELECT id, username, email, phone, roles, verified, 
            full_name, address_street, address_district, address_ward, address_city, 
            avatar_url, created_at, updated_at
     FROM users WHERE id = ?`,
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Update user (admin) */
export async function updateUser(userId, updates) {
  const { roles, verified, username, email, phone, full_name } = updates;

  // Check if user exists
  const [rows] = await pool.execute(`SELECT id FROM users WHERE id = ?`, [
    userId,
  ]);
  if (rows.length === 0) {
    return false;
  }

  // Build dynamic update
  const updateFields = [];
  const params = [];

  if (roles !== undefined) {
    updateFields.push("roles = ?");
    params.push(roles);
  }
  if (verified !== undefined) {
    updateFields.push("verified = ?");
    params.push(verified ? 1 : 0);
  }
  if (username !== undefined) {
    updateFields.push("username = ?");
    params.push(username);
  }
  if (email !== undefined) {
    updateFields.push("email = ?");
    params.push(email);
  }
  if (phone !== undefined) {
    updateFields.push("phone = ?");
    params.push(phone ?? null);
  }
  if (full_name !== undefined) {
    updateFields.push("full_name = ?");
    params.push(full_name ?? null);
  }

  if (updateFields.length > 0) {
    params.push(userId);
    const [result] = await pool.execute(
      `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
      params
    );
    return result.affectedRows > 0;
  }
  return false;
}

/** Delete user (admin) */
export async function deleteUser(userId) {
  const [result] = await pool.execute(`DELETE FROM users WHERE id = ?`, [
    userId,
  ]);
  return result.affectedRows > 0;
}

/** Delete user's own account */
export async function deleteOwnAccount(userId) {
  const [result] = await pool.execute(`DELETE FROM users WHERE id = ?`, [
    userId,
  ]);
  return result.affectedRows > 0;
}

/** Set or update user password */
export async function setPassword(userId, hashedPassword) {
  const [result] = await pool.execute(`UPDATE users SET pw = ? WHERE id = ?`, [
    hashedPassword,
    userId,
  ]);
  return result.affectedRows > 0;
}

/** Create new user with Google OAuth */
export async function createGoogleUser({
  username,
  email,
  hashedPassword,
  displayName,
  avatarUrl,
  providerId,
}) {
  const [result] = await pool.execute(
    `INSERT INTO users (username, email, pw, roles, auth_provider, auth_provider_id, verified, full_name, avatar_url)
     VALUES (?, ?, ?, 'customer', 'google', ?, 1, ?, ?)`,
    [username, email, hashedPassword, providerId, displayName, avatarUrl]
  );
  return result.insertId;
}

/** Check if user exists by email */
export async function userExistsByEmail(email) {
  const [rows] = await pool.execute("SELECT id FROM users WHERE email = ?", [
    email,
  ]);
  return rows.length > 0;
}

/** Get user by email */
export async function getUserByEmail(email) {
  const [rows] = await pool.execute(
    "SELECT id, email, username, roles FROM users WHERE email = ?",
    [email]
  );
  return rows.length > 0 ? rows[0] : null;
}
