// dacna-be/src/routes/payment.js
import { Router } from "express";
import axios from "axios";
import { pool } from "../db.js";

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";

/**
 * Generate PayPal access token
 */
async function getPayPalAccessToken() {
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await axios.post(
    `${PAYPAL_API_BASE}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data.access_token;
}

/**
 * Generate payment URL for PayPal sandbox
 * POST /api/payment/paypal/create
 */
router.post("/paypal/create", async (req, res) => {
  try {
    const { orderId, amount, orderCode } = req.body;

    if (!orderId || !amount || !orderCode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Create PayPal order
    const createOrderResponse = await axios.post(
      `${PAYPAL_API_BASE}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: orderCode,
            description: `Order ${orderCode}`,
            amount: {
              currency_code: "USD",
              value: amount.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: `${FRONTEND_URL}/payment/paypal/success?orderId=${orderId}&orderCode=${encodeURIComponent(
            orderCode
          )}`,
          cancel_url: `${FRONTEND_URL}/payment/paypal/cancel?orderId=${orderId}&orderCode=${encodeURIComponent(
            orderCode
          )}`,
          brand_name: "DACNA Store",
          user_action: "PAY_NOW",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Get approval URL from PayPal response
    const approvalUrl = createOrderResponse.data.links.find(
      (link) => link.rel === "approve"
    )?.href;

    if (!approvalUrl) {
      throw new Error("No approval URL from PayPal");
    }

    // Store PayPal order ID for later capture
    await pool.execute(
      `UPDATE orders SET payment_gateway_id = ? WHERE id = ?`,
      [createOrderResponse.data.id, orderId]
    );

    res.json({
      ok: true,
      paymentUrl: approvalUrl,
      paypalOrderId: createOrderResponse.data.id,
    });
  } catch (error) {
    console.error("PayPal create error:", error.response?.data || error);
    res.status(500).json({ error: "Failed to create PayPal payment" });
  }
});

/**
 * Handle PayPal payment success (capture the payment)
 * GET /api/payment/paypal/capture
 */
router.get("/paypal/capture", async (req, res) => {
  try {
    const { token, orderId } = req.query;

    if (!token || !orderId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Capture the PayPal order
    const captureResponse = await axios.post(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${token}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (captureResponse.data.status === "COMPLETED") {
      // Update order status to paid AFTER successful capture
      // Note: payment_method = 'card' as placeholder (PayPal not in enum), actual transaction ID is in payment_gateway_id
      console.log("💾 Updating order", orderId, "to paid status after PayPal capture");
      await pool.execute(
        `UPDATE orders SET payment_status = 'paid', order_status = 'paid', payment_method = 'card' WHERE id = ?`,
        [orderId]
      );
      console.log("✅ Order updated successfully");

      res.json({
        ok: true,
        message: "Payment successful",
        paypalOrderId: token,
      });
    } else {
      throw new Error(`Payment not completed. Status: ${captureResponse.data.status}`);
    }
  } catch (error) {
    console.error("PayPal capture error:", error.response?.data || error.message);
    // Extract actual error from PayPal response
    const paypalError = error.response?.data?.details?.[0]?.issue || error.message;
    res.status(500).json({ ok: false, error: paypalError || "Failed to capture PayPal payment" });
  }
});

/**
 * Cancel a pending PayPal order (user cancelled at gateway)
 * POST /api/payment/paypal/cancel
 * Body: { orderId }
 */
router.post("/paypal/cancel", async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId" });
    }

    console.log("🔴 PayPal Cancel - Order ID:", orderId);

    const [rows] = await pool.execute(
      "SELECT payment_status, order_status, payment_method FROM orders WHERE id = ?",
      [orderId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }
    const order = rows[0];

    // Allow cancellation if:
    // 1. payment_method is NULL (payment not recorded yet), OR
    // 2. order_status is 'cart' (checkout reserved stock but payment failed)
    if (order.payment_method !== null && order.order_status !== "cart") {
      return res.status(400).json({ error: "Cannot cancel an order that's already being processed" });
    }

    // Restore stock before deleting
    const [items] = await pool.execute(
      "SELECT product_id, qty FROM order_items WHERE order_id = ?",
      [orderId]
    );

    for (const item of items) {
      await pool.execute(
        "UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?",
        [item.qty, item.product_id]
      );
    }

    console.log("✅ Stock restored for", items.length, "items");

    // Delete the order; ON DELETE CASCADE cleans up order_items
    await pool.execute("DELETE FROM orders WHERE id = ?", [orderId]);

    console.log("✅ PayPal Order Deleted");
    return res.json({ ok: true, deleted: true, message: "Order cancelled and removed" });
  } catch (error) {
    console.error("❌ PayPal cancel error:", error);
    res.status(500).json({ error: "Failed to cancel PayPal order" });
  }
});

/**
 * Process payment callback and update order status
 * POST /api/payment/callback
 */
router.post("/callback", async (req, res) => {
  try {
    const { orderId, status, transactionId, paymentMethod } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Update order payment status
    if (status === "success") {
      await pool.execute(
        `UPDATE orders SET payment_status = 'paid', order_status = 'paid', payment_method = ? WHERE id = ?`,
        [paymentMethod || 'unknown', orderId]
      );
    } else if (status === "failed") {
      // Delete failed unpaid order entirely so user must recreate cart
      await pool.execute(
        `DELETE FROM orders WHERE id = ? AND payment_status = 'unpaid'`,
        [orderId]
      );
    }

    res.json({
      ok: true,
      message: `Payment ${status}`,
    });
  } catch (error) {
    console.error("Payment callback error:", error);
    res.status(500).json({ error: "Failed to process payment callback" });
  }
});

export default router;
