import { pool } from "../db.js";

/**
 * Get products with filters: category, price range, search, sort
 * Supports: slug filters, trending/bestseller flags, price min/max, sorting
 */
export async function list(options = {}) {
  const {
    categorySlug,
    subCategorySlug,
    isTrending,
    isBestSeller,
    isTopRated,
    q,
    minPrice,
    maxPrice,
    sortBy,
    includeDeleted,
  } = options;

  // Base query with JOINs for categories and thumbnail
  let sql = `
    SELECT
      p.id, p.sku, p.name, p.model, p.price, p.sale_price, p.stock_qty,
      p.is_trending, p.is_bestseller, p.average_rating, p.review_count,
      p.category_id, p.sub_category_id, p.is_active,
      c.name AS category_name, c.slug AS category_slug,
      sc.name AS sub_category_name, sc.slug AS sub_category_slug,
      (SELECT img.image_url FROM product_images img 
       WHERE img.product_id = p.id 
       ORDER BY img.is_thumbnail DESC, img.display_order ASC
       LIMIT 1) AS thumbnail_url
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
  `;

  const whereClauses = [];
  const params = [];

  // Filter to show only active products (unless includeDeleted is true)
  if (!includeDeleted) {
    whereClauses.push("p.is_active = 1");
  }

  // Dynamic WHERE clauses based on filters
  if (categorySlug) {
    whereClauses.push("c.slug = ?");
    params.push(categorySlug);
  }
  if (subCategorySlug) {
    whereClauses.push("sc.slug = ?");
    params.push(subCategorySlug);
  }
  if (isTrending) whereClauses.push("p.is_trending = 1");
  if (isBestSeller) whereClauses.push("p.is_bestseller = 1");
  if (isTopRated) whereClauses.push("p.average_rating >= 4.5");

  if (q) {
    whereClauses.push("(p.name LIKE ? OR p.model LIKE ? OR p.sku LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  // Price range: COALESCE prioritizes sale_price over regular price
  if (minPrice !== undefined) {
    whereClauses.push("COALESCE(p.sale_price, p.price) >= ?");
    params.push(minPrice);
  }
  if (maxPrice !== undefined) {
    whereClauses.push("COALESCE(p.sale_price, p.price) <= ?");
    params.push(maxPrice);
  }

  if (whereClauses.length > 0) {
    sql += " WHERE " + whereClauses.join(" AND ");
  }

  // Sorting options: price-asc, price-desc, rating, newest (default)
  if (sortBy === "price-asc") {
    sql += " ORDER BY COALESCE(p.sale_price, p.price) ASC";
  } else if (sortBy === "price-desc") {
    sql += " ORDER BY COALESCE(p.sale_price, p.price) DESC";
  } else if (sortBy === "rating") {
    sql += " ORDER BY p.average_rating DESC, p.review_count DESC";
  } else if (sortBy === "newest" || isTopRated) {
    sql += " ORDER BY p.created_at DESC";
  } else {
    sql += " ORDER BY p.created_at DESC";
  }

  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * [GET] /api/products/:id
 * Lấy chi tiết 1 sản phẩm.
 * Đây là một truy vấn phức tạp, gom dữ liệu từ 4 bảng con
 */
export async function getById(id) {
  /*
   Sử dụng JSON_ARRAYAGG và JSON_OBJECT để gom nhóm ảnh, thông số, 
   và đánh giá thành các mảng JSON ngay trong SQL.
   COALESCE(..., '[]') để đảm bảo trả về mảng rỗng thay vì NULL nếu không có.
  */
  const sql = `
    SELECT
      p.id, p.sku, p.name, p.model, p.description, p.price, p.sale_price,
      p.stock_qty, p.is_trending, p.is_bestseller, p.average_rating, p.review_count,
      p.category_id, p.sub_category_id,
      
      -- 1. Thông tin Category & Sub-Category
      c.name AS category_name,
      c.slug AS category_slug,
      sc.name AS sub_category_name,
      sc.slug AS sub_category_slug,
      
      -- 2. Gom nhóm mảng Ảnh (sắp xếp theo display_order)
      COALESCE(
        (SELECT JSON_ARRAYAGG(img.image_url)
         FROM product_images img 
         WHERE img.product_id = p.id
         ORDER BY img.is_thumbnail DESC, img.display_order ASC),
      '[]') AS images,
      
      -- 3. Gom nhóm mảng Thông số
      COALESCE(
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('key', spec.spec_key, 'value', spec.spec_value))
         FROM product_specifications spec 
         WHERE spec.product_id = p.id),
      '[]') AS specifications,
      
      -- 4. Gom nhóm mảng Đánh giá (sắp xếp theo ngày mới nhất)
      COALESCE(
        (SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'id', r.id,
          'rating', r.rating,
          'title', r.title,
          'comment', r.comment,
          'author', r.author_name_snapshot,
          'date', r.created_at,
          'isVerified', r.is_verified_purchase,
          'user_id', r.user_id,
          'admin_reply', r.admin_reply,
          'admin_reply_at', r.admin_reply_at
         ))
         FROM (SELECT * FROM reviews WHERE product_id = p.id ORDER BY created_at DESC) r),
      '[]') AS reviews
      
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN sub_categories sc ON p.sub_category_id = sc.id
    
    WHERE p.id = ? AND p.is_active = 1
    
    GROUP BY p.id, c.id, sc.id; 
  `;

  const [rows] = await pool.execute(sql, [id]);

  if (!rows.length) return null;

  // Parse các chuỗi JSON trả về từ CSDL
  const product = rows[0];
  product.images = JSON.parse(product.images);
  product.specifications = JSON.parse(product.specifications);
  product.reviews = JSON.parse(product.reviews);

  return product;
}

/**
 * Create a new review for a product
 */
export async function createReview(productId, reviewData) {
  const { userId, rating, title, comment, authorName, isVerifiedPurchase } =
    reviewData;

  const sql = `
    INSERT INTO reviews (product_id, user_id, rating, title, comment, author_name_snapshot, is_verified_purchase)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.execute(sql, [
    productId,
    userId ?? null, // Use nullish coalescing to ensure null instead of undefined
    rating,
    title ?? null,
    comment ?? null,
    authorName ?? "Anonymous",
    isVerifiedPurchase ?? false,
  ]);

  // Update product average rating and review count
  await updateProductRating(productId);

  return result.insertId;
}

/**
 * Update product's average rating and review count
 * Only updates if there are reviews, otherwise keeps current rating
 */
export async function updateProductRating(productId) {
  const sql = `
    UPDATE products p
    SET 
      average_rating = COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = ?), p.average_rating),
      review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ?)
    WHERE p.id = ?
  `;

  await pool.execute(sql, [productId, productId, productId]);
}

/**
 * Get a review by ID
 */
export async function getReviewById(reviewId) {
  const sql = `SELECT * FROM reviews WHERE id = ?`;
  const [rows] = await pool.execute(sql, [reviewId]);
  return rows.length ? rows[0] : null;
}

/**
 * Update a review
 */
export async function updateReview(reviewId, updateData) {
  const { rating, comment } = updateData;

  const sql = `
    UPDATE reviews 
    SET rating = ?, comment = ?, created_at = NOW()
    WHERE id = ?
  `;

  const [result] = await pool.execute(sql, [
    Number(rating),
    comment ?? null,
    reviewId,
  ]);

  return result.affectedRows > 0;
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId) {
  const sql = `DELETE FROM reviews WHERE id = ?`;
  const [result] = await pool.execute(sql, [reviewId]);
  return result.affectedRows > 0;
}

/**
 * Create a new product (admin)
 */
export async function createProduct(data) {
  const {
    sku,
    name,
    model,
    description,
    price,
    sale_price,
    category_id,
    sub_category_id,
    stock_qty,
    is_trending,
    is_bestseller,
    specifications,
    images,
  } = data;

  // Insert product
  const [result] = await pool.execute(
    `INSERT INTO products 
     (sku, name, model, description, price, sale_price, category_id, sub_category_id, 
      stock_qty, is_trending, is_bestseller) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sku,
      name,
      model || null,
      description || null,
      price,
      sale_price || null,
      category_id,
      sub_category_id || null,
      stock_qty || 0,
      is_trending ? 1 : 0,
      is_bestseller ? 1 : 0,
    ]
  );

  const productId = result.insertId;

  // Insert specifications if provided
  if (specifications && Array.isArray(specifications)) {
    for (const spec of specifications) {
      await pool.execute(
        `INSERT INTO product_specifications (product_id, spec_key, spec_value) 
         VALUES (?, ?, ?)`,
        [productId, spec.key, spec.value]
      );
    }
  }

  // Insert images if provided
  if (images && Array.isArray(images)) {
    for (let i = 0; i < images.length; i++) {
      await pool.execute(
        `INSERT INTO product_images (product_id, image_url, is_thumbnail, display_order) 
         VALUES (?, ?, ?, ?)`,
        [productId, images[i], i === 0 ? 1 : 0, i]
      );
    }
  }

  return productId;
}

/**
 * Update a product (admin)
 */
export async function updateProduct(productId, data) {
  const {
    sku,
    name,
    model,
    description,
    price,
    sale_price,
    category_id,
    sub_category_id,
    stock_qty,
    is_trending,
    is_bestseller,
    specifications,
    images,
  } = data;

  // Check if product exists
  const [rows] = await pool.execute(`SELECT id FROM products WHERE id = ?`, [
    productId,
  ]);
  if (rows.length === 0) {
    return false;
  }

  // Build dynamic update query
  const updates = [];
  const params = [];

  if (sku !== undefined) {
    updates.push("sku = ?");
    params.push(sku);
  }
  if (name !== undefined) {
    updates.push("name = ?");
    params.push(name);
  }
  if (model !== undefined) {
    updates.push("model = ?");
    params.push(model);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    params.push(description);
  }
  if (price !== undefined) {
    updates.push("price = ?");
    params.push(price);
  }
  if (sale_price !== undefined) {
    updates.push("sale_price = ?");
    params.push(sale_price);
  }
  if (category_id !== undefined) {
    updates.push("category_id = ?");
    params.push(category_id);
  }
  if (sub_category_id !== undefined) {
    updates.push("sub_category_id = ?");
    params.push(sub_category_id);
  }
  if (stock_qty !== undefined) {
    updates.push("stock_qty = ?");
    params.push(stock_qty);
  }
  if (is_trending !== undefined) {
    updates.push("is_trending = ?");
    params.push(is_trending ? 1 : 0);
  }
  if (is_bestseller !== undefined) {
    updates.push("is_bestseller = ?");
    params.push(is_bestseller ? 1 : 0);
  }

  if (updates.length > 0) {
    params.push(productId);
    const query = `UPDATE products SET ${updates.join(
      ", "
    )}, updated_at = NOW() WHERE id = ?`;
    await pool.execute(query, params);
  }

  // Handle specifications update
  if (specifications) {
    // Delete existing specs
    await pool.execute(
      `DELETE FROM product_specifications WHERE product_id = ?`,
      [productId]
    );

    // Insert new specs
    if (Array.isArray(specifications)) {
      for (const spec of specifications) {
        await pool.execute(
          `INSERT INTO product_specifications (product_id, spec_key, spec_value) 
           VALUES (?, ?, ?)`,
          [productId, spec.key, spec.value]
        );
      }
    }
  }

  // Handle images update
  if (images) {
    // Delete existing images
    await pool.execute(`DELETE FROM product_images WHERE product_id = ?`, [
      productId,
    ]);

    // Insert new images
    if (Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        await pool.execute(
          `INSERT INTO product_images (product_id, image_url, is_thumbnail, display_order) 
           VALUES (?, ?, ?, ?)`,
          [productId, images[i], i === 0 ? 1 : 0, i]
        );
      }
    }
  }

  return true;
}

/**
 * Delete a product (admin)
 */
export async function deleteProduct(productId) {
  try {
    // SOFT DELETE: Set is_active to 0 instead of hard delete
    // This preserves:
    // - Order history (order_items with product snapshots)
    // - Purchase records
    // - Reviews and ratings
    const [result] = await pool.execute(
      `UPDATE products SET is_active = 0, updated_at = NOW() WHERE id = ?`,
      [productId]
    );

    console.log(`[DELETE PRODUCT] Product ${productId} marked as inactive (soft delete)`);
    return result.affectedRows > 0;
  } catch (err) {
    console.error(`Error soft-deleting product ${productId}:`, err);
    throw err;
  }
}

/**
 * Update product stock quantity
 */
export async function updateProductStock(productId, qty) {
  const [result] = await pool.execute(
    `UPDATE products SET stock_qty = ?, updated_at = NOW() WHERE id = ?`,
    [qty, productId]
  );
  return result.affectedRows > 0;
}
