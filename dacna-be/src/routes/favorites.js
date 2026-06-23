import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { getMyFavorites, addFavorite, removeFavorite } from "../controllers/favoritesController.js";

const router = Router();

router.get("/", authMiddleware, getMyFavorites);
router.post("/", authMiddleware, addFavorite);
router.delete("/:productId", authMiddleware, removeFavorite);

export default router;
