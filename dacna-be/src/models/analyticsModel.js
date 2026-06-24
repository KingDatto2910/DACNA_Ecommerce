import { pool } from "../db.js";

/**
 * Fetch daily analytics data for a given date (YYYY-MM-DD)
 */
export async function getDailyAnalytics(date) {
  const [rows] = await pool.execute(
    `SELECT 
        o.id, 
        o.order_status, 
        o.grand_total AS total_amount, 
        o.created_at, 
        o.payment_method, 
        oi.product_id, 
        oi.qty, 
        p.name AS product_name, 
        p.price
     FROM orders o
     LEFT JOIN order_items oi ON o.id = oi.order_id
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE DATE(o.created_at) = ?
     ORDER BY o.created_at DESC`,
    [date]
  );

  if (!rows || rows.length === 0) {
    return {
      date,
      totalOrders: 0,
      totalRevenue: 0,
      ordersCount: {
        cart: 0,
        paid: 0,
        processing: 0,
        shipping: 0,
        delivered: 0,
        cancelled: 0,
      },
      topProducts: [],
      paymentMethods: [],
    };
  }

  const uniqueOrders = new Map();
  const productMap = new Map();
  const paymentMethodMap = new Map();

  for (const row of rows) {
    const orderId = row.id;

    if (!uniqueOrders.has(orderId)) {
      uniqueOrders.set(orderId, {
        id: orderId,
        status: row.order_status,
        total: parseFloat(row.total_amount) || 0,
        paymentMethod: row.payment_method || "unknown",
      });

      // track payment method once per order
      const method = row.payment_method || "unknown";
      if (!paymentMethodMap.has(method)) {
        paymentMethodMap.set(method, { method, count: 0, revenue: 0 });
      }
      const pm = paymentMethodMap.get(method);
      pm.count += 1;
      pm.revenue += parseFloat(row.total_amount) || 0;
    }

    // track products per item row
    if (row.product_id && row.product_name) {
      const key = row.product_id;
      if (!productMap.has(key)) {
        productMap.set(key, {
          productName: row.product_name,
          quantity: 0,
          revenue: 0,
        });
      }
      const product = productMap.get(key);
      const qty = row.qty || 0;
      const price = row.price || 0;
      product.quantity += qty;
      product.revenue += price * qty;
    }
  }

  const ordersList = Array.from(uniqueOrders.values());
  const totalOrders = ordersList.length;
  const totalRevenue = ordersList.reduce((sum, o) => sum + o.total, 0);

  const ordersCount = {
    cart: 0,
    paid: 0,
    processing: 0,
    shipping: 0,
    delivered: 0,
    cancelled: 0,
  };

  ordersList.forEach((order) => {
    if (ordersCount.hasOwnProperty(order.status)) {
      ordersCount[order.status] += 1;
    }
  });

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const paymentMethods = Array.from(paymentMethodMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  return {
    date,
    totalOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    ordersCount,
    topProducts,
    paymentMethods,
  };
}
