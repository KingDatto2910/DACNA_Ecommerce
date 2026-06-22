// dacna/lib/auth-api.ts

import { AuthUser } from "@/hooks/use-auth";
import { LoginCredentials, RegisterData } from "./types";

const API_URL = "http://localhost:5000"; // Địa chỉ Backend

/**
 * Định nghĩa cấu trúc trả về của API Login
 */
interface LoginResponse {
  token: string;
  user: AuthUser;
} //Give the token and user info when login success

/**
 * Hàm POST API cơ sở (khác với fetchApi GET)
 */
async function postApi<T, R>(path: string, body: T): Promise<R> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      // Nếu API trả lỗi (400, 403, 500...), ném ra lỗi
      throw new Error(data.message || data.error || "API request failed");
    }

    return data; // Trả về toàn bộ response (ví dụ: { ok: true, token: ..., user: ... })
  } catch (err: any) {
    console.error(`POST API error at ${path}:`, err);
    throw new Error(err.message || "API Network Error");
  }
}

// --- Các hàm API Xác thực ---

export async function apiLogin(
  credentials: LoginCredentials
): Promise<LoginResponse> {
  // Gọi POST /auth/login
  const response = await postApi<
    LoginCredentials,
    { ok: boolean; message: string; token: string; user: AuthUser }
  >("/auth/login", credentials);
  return { token: response.token, user: response.user };
}

export async function apiRegister(data: RegisterData): Promise<void> {
  // Gọi POST /auth/register
  await postApi<RegisterData, { ok: boolean; message: string }>(
    "/auth/register",
    data
  );
}

export async function apiVerifyOtp(email: string, otp: string): Promise<void> {
  // Gọi POST /auth/otp/register/verify
  await postApi<
    { email: string; otp: string },
    { ok: boolean; message: string }
  >("/auth/otp/register/verify", { email, otp });
}
