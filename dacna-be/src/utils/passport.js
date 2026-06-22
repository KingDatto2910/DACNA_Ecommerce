import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { pool } from "../db.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Chuẩn hoá dữ liệu từ Google profile, thay undefined → null
        const email = profile.emails?.[0]?.value ?? null;
        const displayName = profile.displayName ?? null;
        const avatarUrl = profile.photos?.[0]?.value ?? null;
        const providerId = profile.id ?? null;

        if (!email) {
          return done(new Error("Google không trả về email"), null);
        }

        // Tìm user theo email
        let [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [
          email,
        ]);

        let user;

        // Đã có user → login
        if (rows.length > 0) {
          user = rows[0];

          // Trả về object user cho passport session & JWT
          done(null, {
            id: user.id ?? null,
            email: user.email ?? null,
            name: user.username ?? user.full_name ?? displayName ?? "User",
            avatar: user.avatar_url ?? avatarUrl ?? null,
            role: user.roles ?? "customer",
            provider: user.auth_provider ?? "google",
            needsPassword: false, // Đã có tài khoản
          });
        } else {
          // Chưa có user → cần đăng ký (set password)
          // Trả về thông tin tạm để frontend redirect set-password
          done(null, {
            id: null, // Chưa có ID
            email: email,
            name: displayName || email.split("@")[0],
            avatar: avatarUrl,
            role: "customer",
            provider: "google",
            needsPassword: true, // Cần set password
            googleProfile: {
              email,
              displayName,
              avatarUrl,
              providerId,
            },
          });
        }
      } catch (err) {
        console.error("❌ Lỗi khi xử lý Google OAuth2:", err);
        done(err, null);
      }
    }
  )
);

// lưu vào session
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

export default passport;
