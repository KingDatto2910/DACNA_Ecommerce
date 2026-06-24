import { Router } from "express";
import {
  listProducts,
  getProductDetails,
  createReview,
  updateReview,
  deleteReview,
  createProduct,
  updateProduct,
  deleteProduct,
  reviveProduct,
  getDeletedProducts,
  updateProductStock,
} from "../controllers/productController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/auth.js";

const router = Router();

// ========== ADMIN ROUTES ==========
// POST http://localhost:5000/api/products/admin (admin only)
router.post("/admin", authMiddleware, roleMiddleware(["admin"]), createProduct);

// PATCH http://localhost:5000/api/products/admin/:id (admin only)
router.patch(
  "/admin/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  updateProduct
);

// DELETE http://localhost:5000/api/products/admin/:id (admin only)
router.delete(
  "/admin/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  deleteProduct
);

// PATCH http://localhost:5000/api/products/admin/:id/revive (admin only)
router.patch(
  "/admin/:id/revive",
  authMiddleware,
  roleMiddleware(["admin"]),
  reviveProduct
);

// GET http://localhost:5000/api/products/admin/deleted (admin only)
router.get(
  "/admin/deleted",
  authMiddleware,
  roleMiddleware(["admin"]),
  getDeletedProducts
);

// PATCH http://localhost:5000/api/products/admin/:id/stock (admin & staff)
router.patch(
  "/admin/:id/stock",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  updateProductStock
);

// ========== PUBLIC ROUTES ==========
// GET http://localhost:5000/api/products
// GET http://localhost:5000/api/products?category_slug=...
router.get("/", listProducts);

// GET http://localhost:5000/api/products/1
router.get("/:id", getProductDetails);

// POST http://localhost:5000/api/products/:id/reviews (requires authentication)
router.post("/:id/reviews", authMiddleware, createReview);

// PATCH http://localhost:5000/api/products/:productId/reviews/:reviewId (requires authentication)
router.patch("/:productId/reviews/:reviewId", authMiddleware, updateReview);

// DELETE http://localhost:5000/api/products/:productId/reviews/:reviewId (requires authentication)
router.delete("/:productId/reviews/:reviewId", authMiddleware, deleteReview);

export default router;
