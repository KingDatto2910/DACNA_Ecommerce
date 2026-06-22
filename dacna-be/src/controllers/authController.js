import * as Auth from "../models/authModel.js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

dotenv.config();

/** Register new user account and send OTP verification email */
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ ok: false, message: "Thiếu thông tin" });

    const exists = await Auth.userExistsByEmail(email);
    if (exists)
      return res.status(400).json({ ok: false, message: "Email đã tồn tại" });

    const bcrypt = (await import("bcrypt")).default;
    const hashed = await bcrypt.hash(password, 10);

    await Auth.createLocalUser(name, email, hashed);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await Auth.createOTP(email, otp, "register");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"DACNA Support" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Mã xác thực đăng ký tài khoản",
      text: `Mã OTP của bạn là: ${otp} (hiệu lực trong 5 phút)`,
    });

    return res.json({
      ok: true,
      message:
        "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.",
    });
  } catch (err) {
    console.error("Lỗi register:", err);
    res.status(500).json({ ok: false, message: "Lỗi máy chủ khi đăng ký" });
  }
}

/** Generate random 6-digit OTP code */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Send OTP via email using nodemailer */
async function sendOTP(email, otp) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"DACNA Support" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Mã OTP xác thực tài khoản",
    text: `Mã OTP của bạn là: ${otp}\nHiệu lực trong 5 phút.`,
  };

  await transporter.sendMail(mailOptions);
}

/** Request new OTP (register or password reset) with rate limiting */
async function requestOtpGeneric(req, res, purpose) {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ ok: false, message: "Thiếu email" });

    // Rate limit: prevent spam (1 OTP per minute)
    const recent = await Auth.getLatestOTP(email, purpose);
    if (recent && new Date() - new Date(recent.created_at) < 60 * 1000)
      return res.status(429).json({
        ok: false,
        message: "Vui lòng chờ 1 phút trước khi yêu cầu mã OTP mới.",
      });

    const otp = generateOTP();
    await Auth.createOTP(email, otp, purpose);

    await sendOTP(email, otp);
    res.json({ ok: true, message: "OTP đã được gửi qua email." });
  } catch (err) {
    console.error("Lỗi gửi OTP:", err);
    res.status(500).json({ ok: false, message: "Lỗi máy chủ khi gửi OTP" });
  }
}

export async function requestRegisterOTP(req, res) {
  await requestOtpGeneric(req, res, "register");
}

export async function requestResetOTP(req, res) {
  await requestOtpGeneric(req, res, "reset");
}

/** Verify OTP code with rate limiting (3 attempts before 2-minute lockout)
 * For purpose "reset": only validates OTP and marks it used; password change is done via a separate endpoint.
 */
async function verifyOtpGeneric(req, res, purpose) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ ok: false, message: "Thiếu thông tin" });

    const record = await Auth.verifyOTP(email, otp, purpose);

    if (!record)
      return res.status(400).json({
        ok: false,
        message: "Không tìm thấy OTP, vui lòng yêu cầu lại.",
      });

    // Check if temporarily locked
    if (record.locked) {
      const diff = Math.ceil(
        (new Date(record.locked_until) - new Date()) / 1000
      );
      return res.status(429).json({
        ok: false,
        message: `Bạn nhập sai quá nhiều. Thử lại sau ${diff} giây.`,
      });
    }

    if (record.expired) {
      return res.status(400).json({ ok: false, message: "OTP đã hết hạn" });
    }

    if (record.is_used) {
      return res
        .status(400)
        .json({ ok: false, message: "OTP đã được sử dụng" });
    }

    // Handle incorrect OTP
    if (record.otp_code !== otp) {
      const attempts = record.attempts + 1;

      await Auth.incrementOTPAttempts(record.id);

      if (attempts >= 3) {
        await Auth.lockOTP(record.id);
        return res.status(400).json({
          ok: false,
          message: "Bạn đã nhập sai quá 3 lần, OTP bị khóa 2 phút.",
        });
      }

      return res.status(400).json({
        ok: false,
        message: `OTP sai (${attempts}/3 lần).`,
      });
    }

    // OTP verified successfully - mark as used
    await Auth.markOTPUsed(record.id);

    // Handle password reset
    if (purpose === "reset") {
      return res.json({
        ok: true,
        message: "OTP verified. You may set a new password now.",
      });
    }

    // Handle registration verification
    if (purpose === "register") {
      await Auth.verifyUserEmail(email);
      return res.json({ ok: true, message: "Xác minh tài khoản thành công" });
    }
  } catch (err) {
    console.error("Lỗi verify OTP:", err);
    res
      .status(500)
      .json({ ok: false, message: "Lỗi máy chủ khi xác minh OTP" });
  }
}

export async function verifyRegisterOTP(req, res) {
  await verifyOtpGeneric(req, res, "register");
}

export async function verifyResetOTP(req, res) {
  await verifyOtpGeneric(req, res, "reset");
}

/** After OTP verification, set a new password (reset flow) */
export async function setNewPasswordAfterOTP(req, res) {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res
        .status(400)
        .json({ ok: false, message: "Thiếu email hoặc mật khẩu mới" });
    }

    // Ensure there is a recently verified OTP record for reset
    const lastOtp = await Auth.getLatestOTP(email, "reset");
    if (!lastOtp || !lastOtp.is_used) {
      return res
        .status(400)
        .json({ ok: false, message: "OTP chưa được xác minh" });
    }

    // Enforce time window after verification (10 minutes)
    const verifiedTime = new Date(lastOtp.updated_at || lastOtp.created_at);
    if (verifiedTime && Date.now() - verifiedTime.getTime() > 10 * 60 * 1000) {
      return res.status(400).json({
        ok: false,
        message: "Hết thời gian đặt lại mật khẩu, vui lòng yêu cầu OTP mới",
      });
    }

    // Fetch current user
    const user = await Auth.getUserByEmail(email);
    if (!user) {
      return res
        .status(404)
        .json({ ok: false, message: "Không tìm thấy tài khoản" });
    }

    const bcrypt = (await import("bcrypt")).default;
    const currentHash = user.pw ?? "";
    // If new password equals old password, reject
    const isSame = await bcrypt.compare(newPassword, currentHash);
    if (isSame) {
      return res.status(400).json({
        ok: false,
        message:
          "You entered the old password, you can log in with this password",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await Auth.updateUserPassword(email, hashed);

    return res.json({ ok: true, message: "Đặt lại mật khẩu thành công" });
  } catch (err) {
    console.error("Lỗi setNewPasswordAfterOTP:", err);
    res
      .status(500)
      .json({ ok: false, message: "Lỗi máy chủ khi đặt lại mật khẩu" });
  }
}

/** Authenticate user and return JWT token */
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ ok: false, message: "Thiếu thông tin đăng nhập" });

    const user = await Auth.getUserByEmail(email);

    if (!user)
      return res
        .status(401)
        .json({ ok: false, message: "Account does not exist" });

    const bcrypt = (await import("bcrypt")).default;
    const isMatch = await bcrypt.compare(password, user.pw);

    if (!isMatch)
      return res.status(401).json({ ok: false, message: "Incorrect password" });

    if (!user.verified)
      return res.status(403).json({
        ok: false,
        message: "Tài khoản chưa xác minh email. Vui lòng kiểm tra hộp thư.",
      });

    // Generate JWT with 1-day expiry
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.roles,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "dacna_secret", {
      expiresIn: "1d",
    });

    res.json({
      ok: true,
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.username,
        role: user.roles,
      },
    });
  } catch (err) {
    console.error("Lỗi login:", err);
    res.status(500).json({ ok: false, message: "Lỗi máy chủ khi đăng nhập" });
  }
}

/** Get current authenticated user's information */
export async function getCurrentUser(req, res) {
  try {
    // req.user populated by authMiddleware
    if (!req.user)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const user = await Auth.getUserByEmail(req.user.email);

    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.username,
        role: user.roles,
        verified: user.verified === 1,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error("Lỗi getCurrentUser:", err);
    res.status(500).json({ ok: false, message: "Lỗi máy chủ" });
  }
}

/** DEBUG: Get all users (remove this in production) */
export async function debugGetAllUsers(req, res) {
  try {
    // Note: This debug function queries all users - consider removing in production
    // For now, we'd need to add a getAllUsers function to authModel if needed
    res.json({
      ok: false,
      message: "Debug function removed - use admin endpoints instead",
    });
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
}
