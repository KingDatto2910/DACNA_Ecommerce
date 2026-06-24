import { pool } from "../db.js";

// Helper function to convert numeric fields from strings to numbers
function convertPromotionFields(promo) {
  if (!promo) return promo;

  return {
    ...promo,
    discount_value: parseFloat(promo.discount_value) || 0,
    min_order_amount: parseFloat(promo.min_order_amount) || null,
    max_discount_amount: parseFloat(promo.max_discount_amount) || null,
    usage_limit: parseInt(promo.usage_limit) || null,
    per_user_limit: parseInt(promo.per_user_limit) || null,
    usage_count: parseInt(promo.usage_count) || 0,
    is_active: Boolean(promo.is_active),
  };
}

/**
 * Get all promotions with pagination and filters
 */
export async function list(options = {}) {
  const {
    page = 1,
    limit = 20,
    is_active,
    search,
    sort_by,
    sort_dir,
  } = options;

  // Normalize pagination inputs to safe integers
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = Math.max(0, (pageNum - 1) * limitNum);

  const whereClauses = [];
  const params = [];

  if (is_active !== undefined) {
    whereClauses.push("is_active = ?");
    params.push(is_active ? 1 : 0);
  }

  if (search) {
    whereClauses.push("(code LIKE ? OR description LIKE ?)");
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern);
  }

  let whereSQL = "";
  if (whereClauses.length > 0) {
    whereSQL = "WHERE " + whereClauses.join(" AND ");
  }

  // Count total
  const countSQL = `SELECT COUNT(*) as total FROM promotions ${whereSQL}`;
  const [countRows] = await pool.execute(countSQL, params);
  const total = countRows[0].total;

  // Sorting
  const allowedSort = {
    id: "id",
    code: "code",
    discount_value: "discount_value",
    start_date: "start_date",
    end_date: "end_date",
    usage_count: "usage_count",
    created_at: "created_at",
  };
  const column = allowedSort[String(sort_by)] || "created_at";
  const direction = String(sort_dir).toUpperCase() === "ASC" ? "ASC" : "DESC";

  const dataSQL = `
    SELECT * FROM promotions 
    ${whereSQL}
    ORDER BY ${column} ${direction}
    LIMIT ${limitNum} OFFSET ${offset}
  `;

  const [rows] = await pool.execute(dataSQL, params);

  // Convert numeric fields
  const convertedRows = rows.map(convertPromotionFields);

  return {
    data: convertedRows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Get promotion by ID
 */
export async function getById(id) {
  const [rows] = await pool.execute(`SELECT * FROM promotions WHERE id = ?`, [
    id,
  ]);
  return convertPromotionFields(rows[0]) || null;
}

/**
 * Get promotion by code
 */
export async function getByCode(code) {
  const [rows] = await pool.execute(`SELECT * FROM promotions WHERE code = ?`, [
    code.toUpperCase(),
  ]);
  return convertPromotionFields(rows[0]) || null;
}

/**
 * Validate promotion code for a user and order
 */
export async function validatePromotion(code, userId, orderAmount) {
  const promo = await getByCode(code);

  if (!promo) {
    return { valid: false, message: "Invalid promotion code" };
  }

  if (!promo.is_active) {
    return { valid: false, message: "This promotion is no longer active" };
  }

  const now = new Date();
  const startDate = new Date(promo.start_date);
  const endDate = new Date(promo.end_date);

  if (now < startDate) {
    return { valid: false, message: "This promotion has not started yet" };
  }

  if (now > endDate) {
    return { valid: false, message: "This promotion has expired" };
  }

  if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
    return {
      valid: false,
      message: "This promotion has reached its usage limit",
    };
  }

  if (promo.min_order_amount && orderAmount < promo.min_order_amount) {
    return {
      valid: false,
      message: `Minimum order amount of $${promo.min_order_amount} required`,
    };
  }

  // Check user usage limit
  if (userId && promo.per_user_limit) {
    const [userUsage] = await pool.execute(
      `SELECT COUNT(*) as count FROM user_promotions 
       WHERE user_id = ? AND promotion_id = ?`,
      [userId, promo.id]
    );

    if (userUsage[0].count >= promo.per_user_limit) {
      return { valid: false, message: "You have already used this promotion" };
    }
  }

  // Calculate discount
  let discountAmount = 0;

  console.log('=== CALCULATING DISCOUNT ===');
  console.log('promo.discount_type:', promo.discount_type);
  console.log('promo.discount_value:', promo.discount_value);
  console.log('orderAmount:', orderAmount);

  if (promo.discount_type === "percentage") {
    discountAmount = (orderAmount * promo.discount_value) / 100;
    console.log(`Percentage discount: ${orderAmount} * ${promo.discount_value}% = ${discountAmount}`);
    if (
      promo.max_discount_amount &&
      discountAmount > promo.max_discount_amount
    ) {
      discountAmount = promo.max_discount_amount;
      console.log(`Capped to max: ${discountAmount}`);
    }
  } else if (promo.discount_type === "fixed") {
    discountAmount = promo.discount_value;
    console.log(`Fixed discount: ${discountAmount}`);
  } else {
    console.error(`ERROR: Unknown discount_type: ${promo.discount_type}`);
  }

  console.log('discountAmount before toFixed:', discountAmount, typeof discountAmount);

  // Ensure discountAmount is a valid number
  if (discountAmount === null || discountAmount === undefined || isNaN(discountAmount)) {
    console.error('ERROR: discountAmount is invalid!', discountAmount);
    discountAmount = 0;
  }

  const finalDiscount = parseFloat(discountAmount.toFixed(2));
  console.log(`Final discount amount: ${finalDiscount}, type: ${typeof finalDiscount}`);

  if (finalDiscount === 0 || isNaN(finalDiscount)) {
    console.error('WARNING: Final discount is 0 or NaN!');
  }

  return {
    valid: true,
    promotion: promo,
    discountAmount: finalDiscount,
  };
}

/**
 * Create a new promotion
 */
export async function create(data) {
  const {
    code,
    description,
    discount_type,
    discount_value,
    min_order_amount,
    max_discount_amount,
    usage_limit,
    per_user_limit,
    start_date,
    end_date,
    is_active,
    category_id,
    sub_category_id,
  } = data;

  const [result] = await pool.execute(
    `INSERT INTO promotions 
     (code, description, discount_type, discount_value, min_order_amount, 
      max_discount_amount, usage_limit, per_user_limit, start_date, end_date, is_active,
      category_id, sub_category_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code.toUpperCase(),
      description || null,
      discount_type,
      discount_value,
      min_order_amount || null,
      max_discount_amount || null,
      usage_limit || null,
      per_user_limit || 1,
      start_date,
      end_date,
      is_active ? 1 : 0,
      category_id || null,
      sub_category_id || null,
    ]
  );

  return result.insertId;
}

/**
 * Update a promotion
 */
export async function update(id, data) {
  const updates = [];
  const params = [];

  const fields = [
    "code",
    "description",
    "discount_type",
    "discount_value",
    "min_order_amount",
    "max_discount_amount",
    "usage_limit",
    "per_user_limit",
    "start_date",
    "end_date",
    "is_active",
    "category_id",
    "sub_category_id",
  ];

  fields.forEach((field) => {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      if (field === "code") {
        params.push(data[field].toUpperCase());
      } else if (field === "is_active") {
        params.push(data[field] ? 1 : 0);
      } else {
        params.push(data[field]);
      }
    }
  });

  if (updates.length === 0) return false;

  params.push(id); // Add id at the end for WHERE clause

  const [result] = await pool.execute(
    `UPDATE promotions SET ${updates.join(", ")} WHERE id = ?`,
    params
  );

  return result.affectedRows > 0;
}

/**
 * Delete a promotion
 */
export async function deletePromotion(id) {
  const [result] = await pool.execute(`DELETE FROM promotions WHERE id = ?`, [
    id,
  ]);
  return result.affectedRows > 0;
}

/**
 * Record promotion usage
 */
export async function recordUsage(promotionId, userId, orderId) {
  // Increment usage count
  await pool.execute(
    `UPDATE promotions SET usage_count = usage_count + 1 WHERE id = ?`,
    [promotionId]
  );

  // Record user usage if user is logged in
  if (userId) {
    await pool.execute(
      `INSERT INTO user_promotions (user_id, promotion_id, order_id) 
       VALUES (?, ?, ?)`,
      [userId, promotionId, orderId || null]
    );
  }
}

/**
 * Get user's promotion usage history
 */
export async function getUserUsage(userId, page = 1, limit = 20) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = Math.max(0, (pageNum - 1) * limitNum);

  const [rows] = await pool.execute(
    `SELECT 
       up.id, up.used_at,
       p.code, p.description, p.discount_type, p.discount_value,
       o.order_code, o.grand_total
     FROM user_promotions up
     JOIN promotions p ON up.promotion_id = p.id
     LEFT JOIN orders o ON up.order_id = o.id
     WHERE up.user_id = ?
     ORDER BY up.used_at DESC
     LIMIT ${limitNum} OFFSET ${offset}`,
    [userId]
  );

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) as total FROM user_promotions WHERE user_id = ?`,
    [userId]
  );

  return {
    data: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limitNum),
    },
  };
}

/**
 * Get applicable promotions for a product based on category/sub-category
 *
 * A promotion applies if:
 * 1. category_id and sub_category_id are both NULL (all products)
 * 2. category_id matches AND sub_category_id is NULL (all in category)
 * 3. category_id matches AND sub_category_id matches (only in sub-category)
 */
export async function getApplicablePromotions(categoryId, subCategoryId) {
  const [rows] = await pool.execute(
    `SELECT * FROM promotions
     WHERE is_active = 1
     AND start_date <= NOW()
     AND end_date >= NOW()
     AND (
       (category_id IS NULL AND sub_category_id IS NULL)
       OR (category_id = ? AND sub_category_id IS NULL)
       OR (category_id = ? AND sub_category_id = ?)
     )
     ORDER BY created_at DESC`,
    [categoryId, categoryId, subCategoryId]
  );

  return rows.map(convertPromotionFields);
}
