import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import passport from "./utils/passport.js"; // Passport có cấu hình GoogleStrategy
import { errorHandler } from "./middlewares/errorHandler.js";

// Import routes
import userRoutes from "./routes/users.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import authRoutes from "./routes/auth.js"; // /auth, /auth/google, /auth/login
import otpRoutes from "./routes/otp.js"; // /auth/otp/*
import categoryRoutes from "./routes/categories.js"; // /api/categories/*
import reviewRoutes from "./routes/reviews.js"; // /api/reviews/*
import promotionRoutes from "./routes/promotions.js"; // /api/promotions/*
import favoritesRoutes from "./routes/favorites.js"; // /api/favorites/*
import paymentRoutes from "./routes/payment.js"; // /api/payment/*
import contactRoutes from "./routes/contact.js"; // /api/contact/*
import chatRoutes from "./routes/chat.js"; // /api/chat/*
import analyticsRoutes from "./routes/analytics.js"; // /api/analytics/*

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
import { initSocket } from "./socket.js";
initSocket(httpServer);

// CORS cho FE
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);

// Parse JSON body
app.use(express.json());

// Serve static files (images, etc.) from public folder
const publicPath = path.join(__dirname, "../public");
app.use("/public", express.static(publicPath));
app.use(express.static(publicPath));

// Session (bắt buộc cho passport OAuth)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dacna_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // true nếu HTTPS
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Health check
app.get("/", (req, res) =>
  res.json({ ok: true, app: "DACNA API (Node)", time: new Date() })
);

// Routes
app.use("/auth", authRoutes);
app.use("/auth/otp", otpRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/analytics", analyticsRoutes);

// Error handler (cuối cùng)
app.use(errorHandler);
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`✓ DACNA API running on http://localhost:${PORT}`);
  console.log(`✓ Static files served from http://localhost:${PORT}/public`);
});
