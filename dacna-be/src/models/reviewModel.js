import { pool } from "../db.js";

/**
 * List all reviews with filters, sorting, and pagination
 */
export async function listAllReviews(filters = {}) {
  const {
    product_id,
    rating,
    search,
    page = 1,
    limit = 20,
    sort_by,
    sort_dir,
  } = filters;

  const whereClauses = [];
  const params = [];

  if (product_id) {
    whereClauses.push("r.product_id = ?");
    params.push(product_id);
  }

  if (rating) {
    whereClauses.push("r.rating = ?");
    params.push(rating);
  }

  if (search) {
    whereClauses.push(
      "(r.comment LIKE ? OR u.username LIKE ? OR p.name LIKE ?)"
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  let whereSQL = "";
  if (whereClauses.length > 0) {
    whereSQL = "WHERE " + whereClauses.join(" AND ");
  }

  // Get total count
  const countSQL = `
    SELECT COUNT(*) as total 
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN products p ON r.product_id = p.id
    ${whereSQL}
  `;

  const [countRows] =
    whereClauses.length > 0
      ? await pool.execute(countSQL, params)
      : await pool.query(countSQL);
  const total = countRows[0].total;

  // Sorting whitelist
  const allowedSort = {
    id: "r.id",
    rating: "r.rating",
    created_at: "r.created_at",
    product_id: "r.product_id",
  };
  const column = allowedSort[String(sort_by)] || "r.created_at";
  const direction = String(sort_dir).toUpperCase() === "ASC" ? "ASC" : "DESC";

  // Get paginated results
  const offset = (page - 1) * limit;

  let rows;

  if (whereClauses.length > 0) {
    // Use named parameters when we have WHERE conditions
    const dataSQL = `
      SELECT 
        r.id, r.product_id, r.user_id, r.rating, r.title, r.comment,
        r.admin_reply, r.admin_reply_at,
        r.is_verified_purchase, r.created_at,
        u.username, u.email,
        p.name as product_name, p.sku as product_sku
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      ${whereSQL}
      ORDER BY ${column} ${direction}
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;
    [rows] = await pool.execute(dataSQL, params);
  } else {
    // No WHERE conditions - use pool.query()
    const dataSQL = `
      SELECT 
        r.id, r.product_id, r.user_id, r.rating, r.title, r.comment,
        r.admin_reply, r.admin_reply_at,
        r.is_verified_purchase, r.created_at,
        u.username, u.email,
        p.name as product_name, p.sku as product_sku
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
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

/**
 * Get a single review by ID
 */
export async function getReviewById(reviewId) {
  const [rows] = await pool.execute(
    `SELECT id, product_id FROM reviews WHERE id = ?`,
    [reviewId]
  );
  return rows.length ? rows[0] : null;
}

/**
 * Delete a review by ID
 */
export async function deleteReview(reviewId) {
  const [result] = await pool.execute(`DELETE FROM reviews WHERE id = ?`, [
    reviewId,
  ]);
  return result.affectedRows > 0;
}

/**
 * Update product rating stats after review changes
 */
export async function updateProductRatingStats(productId) {
  const [stats] = await pool.execute(
    `SELECT 
       COALESCE(AVG(rating), 0) as avg_rating,
       COUNT(*) as review_count
     FROM reviews 
     WHERE product_id = ?`,
    [productId]
  );

  await pool.execute(
    `UPDATE products 
     SET average_rating = ?, review_count = ? 
     WHERE id = ?`,
    [stats[0].avg_rating, stats[0].review_count, productId]
  );
}

/**
 * Update admin reply on a review
 */
export async function updateReviewReply(reviewId, adminReply) {
  const [result] = await pool.execute(
    `UPDATE reviews 
     SET admin_reply = ?, admin_reply_at = NOW() 
     WHERE id = ?`,
    [adminReply.trim(), reviewId]
  );
  return result.affectedRows > 0;
}

/**
 * Check if review exists
 */
export async function reviewExists(reviewId) {
  const [rows] = await pool.execute(`SELECT id FROM reviews WHERE id = ?`, [
    reviewId,
  ]);
  return rows.length > 0;
}
