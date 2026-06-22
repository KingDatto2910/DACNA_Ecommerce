import express from "express";
import passport from "../utils/passport.js";
import {
  register,
  login,
  getCurrentUser,
  debugGetAllUsers,
  setNewPasswordAfterOTP,
} from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// Google OAuth2 login (bước 1: chuyển sang Google)
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

// Google OAuth2 callback (bước 2: Google gọi về)
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/login/failed" }),
  async (req, res) => {
    try {
      const user = req.user;
      if (!user)
        return res
          .status(401)
          .json({ ok: false, error: "Không tìm thấy thông tin user" });

      // Nếu user chưa có ID → cần đăng ký (set password)
      if (user.needsPassword && !user.id) {
        // Lưu thông tin tạm vào session hoặc encode vào URL
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const googleData = Buffer.from(
          JSON.stringify(user.googleProfile)
        ).toString("base64");
        return res.redirect(
          `${frontendUrl}/set-password?google=${encodeURIComponent(googleData)}`
        );
      }

      // User đã có → generate JWT token cho frontend
      const jwt = (await import("jsonwebtoken")).default;
      const token = jwt.sign(
        {
          userId: user.id ?? null,
          email: user.email ?? null,
          role: user.role ?? "customer",
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      // Redirect to frontend with token in URL
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendUrl}/auth/google/callback?token=${token}`);
    } catch (err) {
      console.error("Error in Google callback:", err);
      res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/?error=auth_failed`
      );
    }
  }
);

// Đăng ký local
router.post("/register", register);

// Đăng nhập local (trả JWT)
router.post("/login", login);

// Lấy thông tin user hiện tại
router.get("/me", authMiddleware, getCurrentUser);

// Đặt lại mật khẩu sau khi xác minh OTP (reset flow)
router.post("/reset/set-password", setNewPasswordAfterOTP);

// DEBUG: Get all users from database
router.get("/debug/users", debugGetAllUsers);

// Đăng nhập thất bại
router.get("/login/failed", (req, res) => {
  res.status(401).json({ ok: false, message: "Đăng nhập thất bại" });
});

// Kiểm tra trạng thái đăng nhập
router.get("/status", (req, res) => {
  // Passport tự thêm hàm này nếu bạn dùng express-session
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({
      ok: true,
      message: "Đang đăng nhập",
      user: req.user,
    });
  } else {
    return res.json({
      ok: false,
      message: "Chưa đăng nhập",
    });
  }
});

export default router;
