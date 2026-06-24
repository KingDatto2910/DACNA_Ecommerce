import { Router } from "express";
import {
  listCategories,
  getCategoryDetails,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from "../controllers/categoryController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/auth.js";

const router = Router();

// ========== ADMIN ROUTES ==========
// POST http://localhost:5000/api/categories/admin (admin only)
router.post("/admin", authMiddleware, roleMiddleware(["admin"]), createCategory);

// PATCH http://localhost:5000/api/categories/admin/:id (admin only)
router.patch(
  "/admin/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  updateCategory
);

// DELETE http://localhost:5000/api/categories/admin/:id (admin only)
router.delete(
  "/admin/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  deleteCategory
);

// POST http://localhost:5000/api/categories/admin/:categoryId/subcategories (admin only)
router.post(
  "/admin/:categoryId/subcategories",
  authMiddleware,
  roleMiddleware(["admin"]),
  createSubCategory
);

// PATCH http://localhost:5000/api/categories/admin/:categoryId/subcategories/:id (admin only)
router.patch(
  "/admin/:categoryId/subcategories/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  updateSubCategory
);

// DELETE http://localhost:5000/api/categories/admin/:categoryId/subcategories/:id (admin only)
router.delete(
  "/admin/:categoryId/subcategories/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  deleteSubCategory
);

// ========== PUBLIC ROUTES ==========
// GET http://localhost:5000/api/categories
router.get("/", listCategories);

// GET http://localhost:5000/api/categories/electronics
router.get("/:slug", getCategoryDetails);

export default router;
