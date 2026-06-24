import { Router } from "express";
import {
  create,
  detail,
  addItem,
  removeItem,
  checkout,
  pay,
  updateStatus,
  cancelMyOrder,
  requestCancel,
  getCancelRequest,
  listCancelRequests,
  approveCancelRequest,
  rejectCancelRequest,
  getMyCart,
  getMyOrders,
  createGuestOrder,
  trackByCode,
  listAllOrdersForAdmin,
  getOrderDetailForAdmin,
  clearMyCart,
} from "../controllers/orderController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/auth.js";

const router = Router();

// ============ ADMIN ROUTES ============
// [GET] /api/orders/admin - danh sách tất cả đơn cho admin/staff
router.get(
  "/admin",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  listAllOrdersForAdmin
);

// Cancellation requests for admin/staff (define BEFORE '/admin/:id' to avoid route capture)
router.get(
  "/admin/cancel-requests",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  listCancelRequests
);
router.post(
  "/admin/cancel-requests/:id/approve",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  approveCancelRequest
);
router.post(
  "/admin/cancel-requests/:id/reject",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  rejectCancelRequest
);

// [GET] /api/orders/admin/:id - chi tiết 1 đơn
router.get(
  "/admin/:id",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  getOrderDetailForAdmin
);

// ============ PUBLIC & USER ROUTES ============
// Guest routes (no authentication required)
router.post("/guest", createGuestOrder); // Create guest order
router.get("/track/:code", trackByCode); // Track order by code

// Authenticated routes
router.get("/my-cart", authMiddleware, getMyCart);
router.post("/clear-cart", authMiddleware, clearMyCart);
router.get("/my-orders", authMiddleware, getMyOrders);

router.post("/", authMiddleware, create);

router.get("/:id", authMiddleware, detail);

router.post("/:id/items", authMiddleware, addItem);

router.delete("/:id/items/:productId", authMiddleware, removeItem);

// Tính tổng giá tiền (có ship)
router.post("/:id/checkout", authMiddleware, checkout);

router.post("/:id/pay", authMiddleware, pay);

// Trạng thái (shipping, delivered, cancelled,...) chỉ admin/staff là thay đổi đc
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  updateStatus
);

// Customer cancel own order (not paid)
router.post("/:id/cancel", authMiddleware, cancelMyOrder);
// Customer create and view cancel request (moderated by admin)
router.post("/:id/cancel-request", authMiddleware, requestCancel);
router.get("/:id/cancel-request", authMiddleware, getCancelRequest);

export default router;
