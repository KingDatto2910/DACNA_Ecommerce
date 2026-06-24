import { Router } from "express";
import { getDailyAnalytics } from "../controllers/analyticsController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/auth.js";

const router = Router();

// [GET] /api/analytics/daily?date=YYYY-MM-DD
// Requires admin or staff role
router.get(
  "/daily",
  authMiddleware,
  roleMiddleware(["admin", "staff"]),
  getDailyAnalytics
);

export default router;
