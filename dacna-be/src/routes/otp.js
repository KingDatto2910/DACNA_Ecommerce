import express from "express";
import {
  requestRegisterOTP,
  verifyRegisterOTP,
  requestResetOTP,
  verifyResetOTP
} from "../controllers/authController.js";  

const router = express.Router();

// OTP đăng ký tài khoản
router.post("/register/request", requestRegisterOTP);
router.post("/register/verify", verifyRegisterOTP);

// OTP quên mật khẩu
router.post("/reset/request", requestResetOTP);
router.post("/reset/verify", verifyResetOTP);

export default router;
