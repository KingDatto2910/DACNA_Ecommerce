import { pool } from "../db.js";

export async function addFavorite(userId, productId) {
  try {
    await pool.execute(
      `INSERT INTO favorites (user_id, product_id) VALUES (?, ?)`,
      [userId, productId]
    );
    return true;
  } catch (e) {
    // Duplicate entry simply means already favorited
    if (e.code === "ER_DUP_ENTRY") return true;
    throw e;
  }
}

export async function removeFavorite(userId, productId) {
  const [result] = await pool.execute(
    `DELETE FROM favorites WHERE user_id = ? AND product_id = ?`,
    [userId, productId]
  );
  return result.affectedRows > 0;
}

export async function listFavorites(userId) {
  const sql = `
    SELECT
      p.id,
      p.sku,
      p.name,
      p.model,
      p.price,
      p.sale_price,
      p.stock_qty,
      p.is_trending,
      p.is_bestseller,
      p.average_rating,
      p.review_count,
      c.name AS category_name,
      c.slug AS category_slug,
      sc.name AS sub_category_name,
      sc.slug AS sub_category_slug,
      (SELECT img.image_url FROM product_images img 
         WHERE img.product_id = p.id 
         ORDER BY img.is_thumbnail DESC, img.display_order ASC
         LIMIT 1) AS thumbnail_url
    FROM favorites f
    JOIN products p ON f.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC`;
  const [rows] = await pool.execute(sql, [userId]);
  return rows;
}

export async function isFavorited(userId, productId) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ? LIMIT 1`,
    [userId, productId]
  );
  return rows.length > 0;
}
