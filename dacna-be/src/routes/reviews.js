import { Router } from "express";
import {
  listAllReviews,
  deleteReviewByAdmin,
  updateReviewReply,
} from "../controllers/reviewController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/auth.js";

const router = Router();

// ========== ADMIN ROUTES ==========
// GET /api/reviews/admin - list all reviews (admin only)
router.get("/admin", authMiddleware, roleMiddleware(["admin"]), listAllReviews);

// DELETE /api/reviews/admin/:id - delete review (admin only)
router.delete(
  "/admin/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  deleteReviewByAdmin
);

// PATCH /api/reviews/admin/:id/reply - add/update admin reply (admin/staff)
router.patch(
  "/admin/:id/reply",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  updateReviewReply
);

export default router;
