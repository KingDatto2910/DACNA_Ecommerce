import { pool } from "../db.js";

// Check if user exists by email
export async function userExistsByEmail(email) {
  const [rows] = await pool.execute("SELECT id FROM users WHERE email = ?", [
    email,
  ]);
  return rows.length > 0;
}

// Create new local user account
export async function createLocalUser(name, email, hashedPassword) {
  const [result] = await pool.execute(
    "INSERT INTO users (username, email, pw, auth_provider, roles, verified) VALUES (?, ?, ?, 'local', 'customer', 0)",
    [name, email, hashedPassword]
  );
  return result.insertId;
}

// Create OTP record
export async function createOTP(email, otpCode, purpose) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  const [result] = await pool.execute(
    "INSERT INTO otp_codes (email, otp_code, purpose, expires_at, is_used, attempts, locked_until) VALUES (?, ?, ?, ?, 0, 0, NULL)",
    [email, otpCode, purpose, expiresAt]
  );
  return result.insertId;
}

// Get latest OTP for email and purpose
export async function getLatestOTP(email, purpose) {
  const [rows] = await pool.execute(
    "SELECT * FROM otp_codes WHERE email = ? AND purpose = ? ORDER BY id DESC LIMIT 1",
    [email, purpose]
  );
  return rows.length > 0 ? rows[0] : null;
}

// Verify and use OTP
export async function verifyOTP(email, otpCode, purpose) {
  const [rows] = await pool.execute(
    "SELECT * FROM otp_codes WHERE email = ? AND otp_code = ? AND purpose = ? AND is_used = 0 ORDER BY id DESC LIMIT 1",
    [email, otpCode, purpose]
  );

  if (rows.length === 0) return null;

  const record = rows[0];

  // Check if expired
  if (new Date(record.expires_at) < new Date()) {
    return { ...record, expired: true };
  }

  // Check if locked out
  if (record.locked_until && new Date(record.locked_until) > new Date()) {
    return { ...record, locked: true };
  }

  return record;
}

// Mark OTP as used
export async function markOTPUsed(otpId) {
  const [result] = await pool.execute(
    "UPDATE otp_codes SET is_used = 1 WHERE id = ?",
    [otpId]
  );
  return result.affectedRows;
}

// Increment OTP attempt counter
export async function incrementOTPAttempts(otpId) {
  const [result] = await pool.execute(
    "UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?",
    [otpId]
  );
  return result.affectedRows;
}

// Lock OTP after 3 failed attempts (2 minute lockout)
export async function lockOTP(otpId) {
  const lockedUntil = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
  const [result] = await pool.execute(
    "UPDATE otp_codes SET locked_until = ? WHERE id = ?",
    [lockedUntil, otpId]
  );
  return result.affectedRows;
}

// Get user by email (includes all fields for login)
export async function getUserByEmail(email) {
  const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [
    email,
  ]);
  return rows.length > 0 ? rows[0] : null;
}

// Verify user by email (marks as verified)
export async function verifyUserEmail(email) {
  const [result] = await pool.execute(
    "UPDATE users SET verified = 1 WHERE email = ?",
    [email]
  );
  return result.affectedRows;
}

// Update user password
export async function updateUserPassword(email, hashedPassword) {
  const [result] = await pool.execute(
    "UPDATE users SET pw = ? WHERE email = ?",
    [hashedPassword, email]
  );
  return result.affectedRows;
}

// Get user by Google ID
export async function getUserByGoogleId(googleId) {
  const [rows] = await pool.execute("SELECT * FROM users WHERE google_id = ?", [
    googleId,
  ]);
  return rows.length > 0 ? rows[0] : null;
}

// Create user from Google OAuth
export async function createGoogleUser(googleId, email, name) {
  const [result] = await pool.execute(
    "INSERT INTO users (google_id, email, username, auth_provider, roles, verified) VALUES (?, ?, ?, 'google', 'customer', 1)",
    [googleId, email, name]
  );
  return result.insertId;
}
