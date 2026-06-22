import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { pool } from "../db.js";

dotenv.config();

// Middleware xác thực JWT
export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res
        .status(401)
        .json({ ok: false, error: "Missing or invalid token" });

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "dacna_secret";
    // Fail fast for bad token strings to avoid noisy jwt errors
    if (!token || token === "null" || token === "undefined" || token === "") {
      return res
        .status(401)
        .json({ ok: false, error: "Missing or invalid token" });
    }

    // Giải token
    const decoded = jwt.verify(token, secret);

    // *** VERIFY USER STILL EXISTS IN DATABASE ***
    const userId = decoded.userId ?? decoded.id;
    const [rows] = await pool.query(
      "SELECT id, username, email, roles FROM users WHERE id = ?",
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        ok: false,
        error: "Account has been deleted or does not exist",
      });
    }

    // Gán thông tin user vào req (using fresh data from DB)
    req.user = {
      id: rows[0].id,
      username: rows[0].username,
      email: rows[0].email,
      role: rows[0].roles, // Database column is 'roles' but we use 'role' in the app
    };

    next();
  } catch (err) {
    // Suppress repetitive logging for common JWT errors to avoid console spam
    if (err.name !== "JsonWebTokenError" && err.name !== "TokenExpiredError") {
      console.error("Auth error:", err.message);
    }
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
}

// Middleware kiểm tra role
export function roleMiddleware(roles = []) {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ ok: false, error: "Unauthorized" });

    if (!roles.includes(req.user.role))
      return res
        .status(403)
        .json({ ok: false, error: "Forbidden: insufficient privileges" });

    next();
  };
}
