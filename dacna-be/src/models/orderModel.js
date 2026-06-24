import { pool } from "../db.js";

/** Create new order with unique order code */
export async function createOrder({
  user_id,
  address_street,
  address_district,
  address_ward,
  address_city,
}) {
  const order_code = `OD${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const [result] = await pool.execute(
    `INSERT INTO orders (order_code, user_id, address_street, address_district, address_ward, address_city, order_status)
     VALUES (?, ?, ?, ?, ?, ?, 'cart')`,
    [
      order_code,
      user_id,
      address_street,
      address_district,
      address_ward,
      address_city,
    ]
  );

  return { id: result.insertId, order_code };
}

/** Get basic order info by ID */
export async function getOrderById(orderId) {
  const [rows] = await pool.execute(
    "SELECT id, user_id, order_code, order_status FROM orders WHERE id = ?",
    [orderId]
  );
  return rows.length ? rows[0] : null;
}

/** Get full order details with items and product info */
export async function getOrderDetail(orderId) {
  const [orders] = await pool.execute(
    "SELECT id, user_id, order_code, order_status, subtotal, shipping_fee, grand_total, payment_status, created_at, updated_at FROM orders WHERE id = ?",
    [orderId]
  );
  if (!orders.length) return null;

  const order = orders[0];

  // Join with products to get current product info and thumbnail
  const [items] = await pool.execute(
    `SELECT
      oi.product_id, oi.qty, oi.unit_price, oi.amount,
      p.name, p.model, p.sku,
      (SELECT img.image_url FROM product_images img 
       WHERE img.product_id = p.id 
       ORDER BY img.is_thumbnail DESC LIMIT 1) AS image_url
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?`,
    [orderId]
  );
  order.items = items;
  return order;
}

/** Get all items in an order */
export async function getOrderItems(orderId) {
  const [rows] = await pool.execute(
    "SELECT * FROM order_items WHERE order_id = ?",
    [orderId]
  );
  return rows;
}

/** Add or update item quantity in order (uses INSERT ON DUPLICATE KEY) */
export async function upsertItem(orderId, productId, qty) {
  const [products] = await pool.execute(
    "SELECT name, price, sale_price, stock_qty FROM products WHERE id = ?",
    [productId]
  );
  if (!products.length)
    throw new Error("Sản phẩm không tồn tại hoặc ngừng kinh doanh");

  const product = products[0];

  // Check stock availability - this is just a warning, allow adding to cart
  // Stock will be reserved when order is paid/checked out
  if (product.stock_qty < qty) {
    throw new Error(`Không đủ hàng trong kho. Còn lại: ${product.stock_qty}`);
  }

  const unitPrice = product.sale_price ?? product.price; // Prioritize sale price

  // Upsert order item WITHOUT updating stock
  // Stock will be updated when order is paid/checked out
  await pool.execute(
    `INSERT INTO order_items (order_id, product_id, item_name_snapshot, unit_price, qty)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       qty = VALUES(qty), 
       unit_price = VALUES(unit_price),
       item_name_snapshot = VALUES(item_name_snapshot)`,
    [orderId, productId, product.name, unitPrice, qty]
  );
}

/** Remove item from order */
export async function removeItem(orderId, productId) {
  // Get order status and item qty
  const [orders] = await pool.execute(
    "SELECT order_status FROM orders WHERE id = ?",
    [orderId]
  );

  if (!orders.length) throw new Error("Không tìm thấy đơn hàng");

  const orderStatus = orders[0].order_status;

  // Cannot remove items from delivered or cancelled orders
  if (["delivered", "cancelled"].includes(orderStatus)) {
    throw new Error(
      "Không thể xóa sản phẩm từ đơn hàng đã hoàn thành hoặc bị hủy"
    );
  }

  const [items] = await pool.execute(
    "SELECT qty FROM order_items WHERE order_id = ? AND product_id = ?",
    [orderId, productId]
  );

  const [result] = await pool.execute(
    "DELETE FROM order_items WHERE order_id = ? AND product_id = ?",
    [orderId, productId]
  );

  // Restore product stock only if order is in 'paid', 'processing', or 'shipping' status
  // (stock was reserved when order was paid)
  if (
    items.length > 0 &&
    ["paid", "processing", "shipping"].includes(orderStatus)
  ) {
    await pool.execute(
      "UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?",
      [items[0].qty, productId]
    );
  }

  if (result.affectedRows === 0)
    throw new Error("Sản phẩm không tồn tại trong đơn hàng");
}

/** Recalculate order totals: subtotal, shipping fee, grand total */
export async function recalculateTotals(orderId) {
  console.log('=== RECALCULATE TOTALS START ===');
  console.log('Order ID:', orderId);

  const [rows] = await pool.execute(
    "SELECT SUM(amount) AS subtotal FROM order_items WHERE order_id = ?",
    [orderId]
  );

  const subtotal = rows[0].subtotal || 0;
  const shipping_fee = subtotal > 0 && subtotal < 100 ? 5 : 0; // Free shipping over $100

  console.log('Calculated subtotal:', subtotal);
  console.log('Calculated shipping_fee:', shipping_fee);

  // Fetch any existing promotion application
  const [promoRows] = await pool.execute(
    `SELECT promotion_id, discount_amount FROM orders WHERE id = ?`,
    [orderId]
  );
  let discount = 0;
  if (promoRows.length) {
    discount = promoRows[0].discount_amount || 0;
  }

  console.log('Existing discount from DB:', discount);

  // Ensure discount never exceeds subtotal+shipping
  const maxEligible = subtotal + shipping_fee;
  if (discount > maxEligible) discount = maxEligible;

  const grand_total = subtotal + shipping_fee - discount;

  console.log('Final calculation:');
  console.log('  subtotal:', subtotal);
  console.log('  shipping_fee:', shipping_fee);
  console.log('  discount:', discount);
  console.log('  grand_total:', grand_total);

  await pool.execute(
    `UPDATE orders
     SET subtotal = ?,
         shipping_fee = ?,
         discount_amount = ?,
         grand_total = (? + ?) - ?
     WHERE id = ?`,
    [
      subtotal,
      shipping_fee,
      discount,
      subtotal,
      shipping_fee,
      discount,
      orderId,
    ]
  );

  console.log('=== RECALCULATE TOTALS END ===');
}

/** Move order from cart to awaiting_payment status */
export async function checkoutOrder(orderId) {
  const [orderRows] = await pool.execute(
    "SELECT order_status FROM orders WHERE id = ?",
    [orderId]
  );
  if (!orderRows.length) throw new Error("Không tìm thấy đơn hàng");

  const order = orderRows[0];
  if (order.order_status !== "cart")
    throw new Error(
      "Đơn hàng đã được thanh toán hoặc không ở trạng thái giỏ hàng"
    );

  // Get all items in cart
  const [items] = await pool.execute(
    "SELECT product_id, qty FROM order_items WHERE order_id = ?",
    [orderId]
  );

  // Reserve stock for each item
  for (const item of items) {
    await pool.execute(
      "UPDATE products SET stock_qty = stock_qty - ? WHERE id = ? AND stock_qty >= ?",
      [item.qty, item.product_id, item.qty]
    );

    // Check if stock was actually updated (validate after update)
    const [updated] = await pool.execute(
      "SELECT stock_qty FROM products WHERE id = ?",
      [item.product_id]
    );
    if (updated.length && updated[0].stock_qty < 0) {
      throw new Error(`Không đủ hàng cho sản phẩm ID ${item.product_id}`);
    }
  }

  // IMPORTANT: Do NOT mark order as 'paid' here!
  // Only reserve stock during checkout
  // Order status will be updated to 'paid' when payment is confirmed:
  // - For PayPal: in /api/payment/paypal/capture endpoint
  // - For COD/Card: in payOrder() function
  // This prevents orphaned 'paid' orders if payment fails/crashes
}

/** Mark order as paid (called after payment confirmation) */
export async function payOrder(orderId, method) {
  const [orders] = await pool.execute(
    "SELECT order_status FROM orders WHERE id = ?",
    [orderId]
  );
  if (!orders.length) throw new Error("Không tìm thấy đơn hàng");

  const order = orders[0];
  // Accept 'cart' status (stock already reserved in checkoutOrder)
  if (order.order_status !== "cart")
    throw new Error(`Đơn hàng ở trạng thái '${order.order_status}' không thể thanh toán`);

  // Update order to 'paid' when payment is confirmed
  await pool.execute(
    `UPDATE orders 
     SET payment_method = ?, 
         payment_status = 'paid',
         order_status = 'paid',
         updated_at = NOW()
     WHERE id = ?`,
    [method, orderId]
  );
  // Record promotion usage after successful payment
  const [promoInfo] = await pool.execute(
    `SELECT promotion_id, user_id FROM orders WHERE id = ? AND promotion_id IS NOT NULL`,
    [orderId]
  );
  if (promoInfo.length && promoInfo[0].promotion_id) {
    // Increment usage_count and insert into user_promotions if user exists
    await pool.execute(
      `UPDATE promotions SET usage_count = usage_count + 1 WHERE id = ?`,
      [promoInfo[0].promotion_id]
    );
    if (promoInfo[0].user_id) {
      await pool.execute(
        `INSERT INTO user_promotions (user_id, promotion_id, order_id) VALUES (?, ?, ?)`,
        [promoInfo[0].user_id, promoInfo[0].promotion_id, orderId]
      );
    }
  }
}

/** Apply a validated promotion to an order and recalculate totals */
export async function applyPromotion(orderId, promotion) {
  // promotion: { id, discountAmount, code }
  console.log('=== APPLY PROMOTION ===');
  console.log('Order ID:', orderId);
  console.log('Promotion received:', JSON.stringify(promotion, null, 2));
  console.log('Discount amount type:', typeof promotion.discountAmount);
  console.log('Discount amount value:', promotion.discountAmount);

  // Get current order totals first
  const [rows] = await pool.execute(
    "SELECT SUM(amount) AS subtotal FROM order_items WHERE order_id = ?",
    [orderId]
  );

  const subtotal = parseFloat(rows[0].subtotal) || 0;
  const shipping_fee = subtotal > 0 && subtotal < 100 ? 5.0 : 0.0;

  // CRITICAL: Ensure discount is a number, not string or undefined
  let discount = 0;
  if (promotion.discountAmount !== null && promotion.discountAmount !== undefined) {
    discount = parseFloat(promotion.discountAmount);
    if (isNaN(discount)) {
      console.error('ERROR: discountAmount is NaN!', promotion.discountAmount);
      discount = 0;
    }
  } else {
    console.error('ERROR: discountAmount is null or undefined!');
  }

  const grand_total = subtotal + shipping_fee - discount;

  console.log('Calculated values:');
  console.log('  subtotal (parsed):', subtotal, typeof subtotal);
  console.log('  shipping_fee:', shipping_fee, typeof shipping_fee);
  console.log('  discount (parsed):', discount, typeof discount);
  console.log('  grand_total:', grand_total, typeof grand_total);

  // Update everything in one atomic operation with explicit numeric values
  const sql = `UPDATE orders 
    SET promotion_id = ?, 
        promotion_code = ?, 
        discount_amount = ?,
        subtotal = ?,
        shipping_fee = ?,
        grand_total = ?
    WHERE id = ?`;
  const params = [
    parseInt(promotion.id),
    String(promotion.code),
    discount,  // Already parsed to float
    subtotal,  // Already parsed to float
    shipping_fee,  // Already float
    grand_total,  // Already calculated as float
    parseInt(orderId)
  ];

  console.log('SQL:', sql);
  console.log('Params with types:', params.map((p, i) => `[${i}] ${p} (${typeof p})`));

  const [result] = await pool.execute(sql, params);
  console.log('SQL Result - affectedRows:', result.affectedRows);
  console.log('SQL Result - changedRows:', result.changedRows);
  console.log('SQL Result - warningStatus:', result.warningStatus);

  // Verify the discount was saved
  const [verify] = await pool.execute(
    `SELECT promotion_id, promotion_code, discount_amount, subtotal, shipping_fee, grand_total FROM orders WHERE id = ?`,
    [orderId]
  );
  console.log('Verification after save:', JSON.stringify(verify[0], null, 2));

  if (parseFloat(verify[0].discount_amount) === 0 && discount > 0) {
    console.error('!!!!! CRITICAL ERROR: Discount was NOT saved to database !!!!!');
    console.error('Expected discount:', discount);
    console.error('Actual discount in DB:', verify[0].discount_amount);
  }

  console.log('=== PROMOTION APPLIED ===');
}

/** Update order status (admin/staff only) */
export async function updateStatus(orderId, newStatus) {
  if (newStatus === "cancelled") {
    throw new Error(
      "Admins cannot cancel orders; customers control cancellations"
    );
  }
  // Fetch current order status & payment
  const [rows] = await pool.execute(
    `SELECT order_status, payment_status FROM orders WHERE id = ? LIMIT 1`,
    [orderId]
  );
  if (!rows.length) throw new Error("Không tìm thấy đơn hàng");
  const current = rows[0];
  // Only allow status change if order is paid and not cart/cancelled
  if (current.payment_status !== "paid") {
    throw new Error("Chỉ cập nhật trạng thái cho đơn hàng đã thanh toán");
  }
  if (["cart", "cancelled"].includes(current.order_status)) {
    throw new Error(
      "Không thể cập nhật trạng thái đơn hàng ở trạng thái hiện tại"
    );
  }
  await pool.execute(
    "UPDATE orders SET order_status = ?, updated_at = NOW() WHERE id = ?",
    [newStatus, orderId]
  );
}

/** Customer-initiated cancellation (only own order, only if not paid) */
export async function cancelOrderByUser(orderId, userId) {
  const [rows] = await pool.execute(
    `SELECT user_id, order_status, payment_status FROM orders WHERE id = ? LIMIT 1`,
    [orderId]
  );
  if (!rows.length) throw new Error("Không tìm thấy đơn hàng");
  const order = rows[0];
  if (order.user_id !== userId)
    throw new Error("Bạn không có quyền hủy đơn này");
  if (order.payment_status === "paid")
    throw new Error("Không thể hủy đơn đã thanh toán");
  if (order.order_status === "cancelled")
    throw new Error("Đơn hàng đã được hủy");
  const cancellable = ["cart", "awaiting_payment", "created"];
  if (!cancellable.includes(order.order_status)) {
    throw new Error("Trạng thái hiện tại không thể hủy");
  }
  await pool.execute(
    "UPDATE orders SET order_status = 'cancelled', updated_at = NOW() WHERE id = ?",
    [orderId]
  );
}

/** Find user's cart (order with status='cart') */
export async function getCartDetailByUserId(userId) {
  const [rows] = await pool.execute(
    "SELECT id FROM orders WHERE user_id = ? AND order_status = 'cart' LIMIT 1",
    [userId]
  );
  if (!rows.length) return null;
  return getOrderDetail(rows[0].id);
}

/** Get or create cart for user */
export async function findOrCreateCart(userId) {
  // Try to get existing cart first
  let cart = await getCartDetailByUserId(userId);
  if (cart) return cart;

  // Try to create new cart with INSERT IGNORE to handle race conditions
  const order_code = `CART${Date.now()}${Math.floor(Math.random() * 1000)}`;
  try {
    const [result] = await pool.execute(
      `INSERT IGNORE INTO orders (order_code, user_id, order_status) VALUES (?, ?, 'cart')`,
      [order_code, userId]
    );

    // If insert succeeded, return the new cart
    if (result.insertId) {
      return getOrderDetail(result.insertId);
    }

    // If INSERT IGNORE didn't insert (another process created it), fetch it
    cart = await getCartDetailByUserId(userId);
    if (cart) return cart;

    // Fallback: create with a new unique code
    const fallbackCode = `CART${Date.now()}${Math.floor(
      Math.random() * 10000
    )}`;
    const [fallbackResult] = await pool.execute(
      `INSERT INTO orders (order_code, user_id, order_status) VALUES (?, ?, 'cart')`,
      [fallbackCode, userId]
    );
    return getOrderDetail(fallbackResult.insertId);
  } catch (error) {
    // If error, try one more time to get existing cart
    cart = await getCartDetailByUserId(userId);
    if (cart) return cart;
    throw error;
  }
}

/** Get user's order history (excluding cart) */
export async function getOrdersByUserId(userId) {
  const [orders] = await pool.execute(
    `SELECT 
      id, order_code, order_status, subtotal, shipping_fee, grand_total, 
      payment_status, payment_method, created_at, updated_at
    FROM orders 
    WHERE user_id = ? 
    AND order_status != 'cart'
    ORDER BY created_at DESC`,
    [userId]
  );
  return orders;
}

/** Create order for guest (user_id = NULL) */
export async function createGuestOrder({
  address_street,
  address_district,
  address_ward,
  address_city,
  subtotal,
  shipping_fee,
  grand_total,
  payment_method,
}) {
  const order_code = `OD${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const [result] = await pool.execute(
    `INSERT INTO orders (
      order_code, user_id, address_street, address_district, address_ward, address_city,
      subtotal, shipping_fee, grand_total, payment_method, order_status
    ) VALUES (
      ?, NULL, ?, ?, ?, ?,
      ?, ?, ?, ?, 'cart'
    )`,
    [
      order_code,
      address_street,
      address_district,
      address_ward,
      address_city,
      subtotal || 0,
      shipping_fee || 0,
      grand_total || 0,
      payment_method,
    ]
  );

  return { id: result.insertId, order_code };
}

/** Track order by order code (public access) */
export async function getOrderByCode(orderCode) {
  const [rows] = await pool.execute(
    `SELECT 
      o.id, o.order_code, o.user_id, o.address_street, o.address_district, 
      o.address_ward, o.address_city, o.subtotal, o.shipping_fee, o.discount_amount,
      o.promotion_code, o.grand_total,
      o.payment_method, o.payment_status, o.order_status, 
      o.created_at, o.updated_at
    FROM orders o
    WHERE o.order_code = ?`,
    [orderCode]
  );

  if (rows.length === 0) return null;

  const order = rows[0];

  const [items] = await pool.execute(
    `SELECT 
      oi.id, oi.product_id, oi.item_name_snapshot, oi.unit_price, oi.qty, oi.amount
    FROM order_items oi
    WHERE oi.order_id = ?`,
    [order.id]
  );

  return { ...order, items };
}

/** Create or return existing pending cancel request for an order */
export async function createCancelRequest(orderId, userId) {
  const [existing] = await pool.execute(
    `SELECT id, status FROM cancellation_requests WHERE order_id = ? AND status = 'pending' LIMIT 1`,
    [orderId]
  );
  if (existing.length) {
    return existing[0];
  }
  const [result] = await pool.execute(
    `INSERT INTO cancellation_requests (order_id, user_id, status) VALUES (?, ?, 'pending')`,
    [orderId, userId]
  );
  return { id: result.insertId, status: "pending" };
}

export async function getCancelRequestForOrder(orderId) {
  const [rows] = await pool.execute(
    `SELECT id, order_id, user_id, status, created_at, updated_at
     FROM cancellation_requests WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`,
    [orderId]
  );
  return rows.length ? rows[0] : null;
}

export async function listCancelRequests(status = "pending") {
  const params = [];
  let where = "";
  if (status) {
    where = "WHERE cr.status = ?";
    params.push(status);
  }
  const [rows] = await pool.execute(
    `SELECT cr.id, cr.order_id, cr.user_id, cr.status, cr.created_at, cr.updated_at,
            o.order_code, o.order_status, o.payment_status, o.grand_total,
            u.username, u.email
     FROM cancellation_requests cr
     JOIN orders o ON cr.order_id = o.id
     LEFT JOIN users u ON cr.user_id = u.id
     ${where}
     ORDER BY cr.created_at DESC`,
    params
  );
  return rows;
}

export async function updateCancelRequestStatus(requestId, status) {
  await pool.execute(
    `UPDATE cancellation_requests SET status = ?, updated_at = NOW() WHERE id = ?`,
    [status, requestId]
  );
}

export async function deleteOrderWithItems(orderId) {
  await pool.execute(`DELETE FROM order_items WHERE order_id = ?`, [orderId]);
  await pool.execute(`DELETE FROM orders WHERE id = ?`, [orderId]);
}

/**
 * Clear all items in an order and reset totals
 */
export async function clearItems(orderId) {
  await pool.execute("DELETE FROM order_items WHERE order_id = ?", [orderId]);
  await pool.execute(
    `UPDATE orders
     SET subtotal = 0,
         shipping_fee = 0,
         discount_amount = 0,
         grand_total = 0
     WHERE id = ?`,
    [orderId]
  );
}
