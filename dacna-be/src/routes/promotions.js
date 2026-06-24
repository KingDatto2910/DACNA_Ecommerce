import { Router } from "express";
import {
  listPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  validatePromotion,
  getMyUsage,
} from "../controllers/promotionController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/auth.js";

const router = Router();

// ========== PUBLIC/USER ROUTES ==========
// POST /api/promotions/validate - validate promotion code
router.post("/validate", validatePromotion);

// GET /api/promotions/my-usage - get user's promotion usage history
router.get("/my-usage", authMiddleware, getMyUsage);

// ========== ADMIN ROUTES ==========
// GET /api/promotions/admin - list all promotions
router.get("/admin", authMiddleware, roleMiddleware(["admin"]), listPromotions);

// GET /api/promotions/admin/:id - get promotion details
router.get("/admin/:id", authMiddleware, roleMiddleware(["admin"]), getPromotionById);

// POST /api/promotions/admin - create new promotion
router.post("/admin", authMiddleware, roleMiddleware(["admin"]), createPromotion);

// PATCH /api/promotions/admin/:id - update promotion
router.patch("/admin/:id", authMiddleware, roleMiddleware(["admin"]), updatePromotion);

// DELETE /api/promotions/admin/:id - delete promotion
router.delete("/admin/:id", authMiddleware, roleMiddleware(["admin"]), deletePromotion);

export default router;
