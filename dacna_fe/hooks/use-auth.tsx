// dacna/hooks/use-auth.tsx
"use client"; //Client Component

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
// Chúng ta sẽ cần tạo các hàm API này trong 'lib/api.ts'
import { apiLogin, apiRegister, apiVerifyOtp } from "@/lib/auth-api";
import { LoginCredentials, RegisterData } from "@/lib/types"; // Sẽ định nghĩa

// 1. Định nghĩa kiểu dữ liệu User (đơn giản)
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "customer" | "admin" | "staff";
  avatar_url?: string;
}

// 2. Định nghĩa kiểu dữ liệu cho Context
interface AuthContextType {
  user: AuthUser | null; //Save user info, if not logged in return null
  token: string | null; // Save JWT token, if not logged in return null
  isAuthenticated: boolean; //True if token gotten
  isLoading: boolean; //State for loading
  login: (credentials: LoginCredentials) => Promise<void>; //Contain Login Credentials: email, pw
  register: (data: RegisterData) => Promise<void>; //Contain registration data: name, email, pw, etc.
  verifyOtp: (email: string, otp: string) => Promise<void>; //Contain email and OTP for verification
  logout: () => void; //Delete token and user info
  // Helper functions để check role
  isAdmin: boolean;
  isStaff: boolean;
  isAdminOrStaff: boolean;
} //Promise<void>: Return a promise but does not return any value, jsut notify the promise state

// 3. Tạo Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);
//Create context with AuthContextType, if used outside provider, return undefined

//4. Create a provider component to wrap the app and provide auth state
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Bắt đầu ở true để kiểm tra local storage
  const router = useRouter();

  //children is all components wrapped by AuthProvider, Ex: navbar, footer, etc.
  //Data types of children is all the types of React render
  // 5. Check if logged in on initial load
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("jwt_token"); //Take token from local storage
      const storedUser = localStorage.getItem("auth_user"); //Take user info from local storage

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to load auth state from storage", e);
      // Xóa dữ liệu hỏng
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("auth_user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 5.1. Listen for storage updates (e.g., OAuth callback sets localStorage)
  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const storedToken = localStorage.getItem("jwt_token");
        const storedUser = localStorage.getItem("auth_user");
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error("Failed to sync auth state from storage", e);
      }
    };
    // Note: 'storage' only fires across tabs. We also listen to a custom event for same-tab updates.
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener("auth:update", syncFromStorage as EventListener);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(
        "auth:update",
        syncFromStorage as EventListener
      );
    };
  }, []);

  // 6. Hàm Login
  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const { token, user } = await apiLogin(credentials);

      setToken(token); // Set token state
      setUser(user); // Set user state

      localStorage.setItem("jwt_token", token); // Save token to local storage
      localStorage.setItem("auth_user", JSON.stringify(user)); // Save user info to local storage

      toast.success(`Welcome back, ${user.name}!`);

      // Redirect theo role: admin/staff -> /admin, customer -> /home
      const isAdmin = user.role === "admin";
      const isStaff = user.role === "staff";

      if (isAdmin || isStaff) {
        router.push("/admin");
      } else {
        router.push("/home");
      }
    } catch (error: any) {
      toast.error(error.message || "Login failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Hàm Register
  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      await apiRegister(data);
      toast.success(
        "Registration successful! Please check your email to verify."
      );
      // Chuyển sang trang xác minh
      router.push(`/verify?email=${encodeURIComponent(data.email)}`);
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 8. Hàm Verify OTP
  const verifyOtp = async (email: string, otp: string) => {
    try {
      setIsLoading(true);
      await apiVerifyOtp(email, otp);
      toast.success("Account verified successfully! You can now log in.");
      router.push("/"); // Chuyển về trang login
    } catch (error: any) {
      toast.error(error.message || "Verification failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 9. Hàm Logout
  const logout = (silent: boolean = false) => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("auth_user");
    if (!silent) toast.success("Logged out successfully.");
    router.push("/login-selection"); // Redirect to login selection page
  };

  // Global window event for token expiry triggered by fetch wrappers
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail === "TOKEN_EXPIRED") {
        logout(true);
        toast.error("Session expired. Please log in again.");
      }
      if (e.detail === "UNAUTHORIZED") {
        logout(true);
        toast.error("Unauthorized. Please log in again.");
      }
    };
    window.addEventListener("auth:logout", handler as EventListener);
    return () =>
      window.removeEventListener("auth:logout", handler as EventListener);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    register,
    verifyOtp,
    logout,
    // Helper functions để check role
    isAdmin: user?.role === "admin",
    isStaff: user?.role === "staff",
    isAdminOrStaff: user?.role === "admin" || user?.role === "staff",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 10. Tạo Hook (để dễ sử dụng)
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
