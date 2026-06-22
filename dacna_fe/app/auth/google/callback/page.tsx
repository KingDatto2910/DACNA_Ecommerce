"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return; // ensure single run
    ranRef.current = true;
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      toast.error("Google authentication failed");
      router.push("/");
      return;
    }

    if (token) {
      // Store token and fetch user info
      localStorage.setItem("jwt_token", token);

      // Get user info from backend
      fetch("http://localhost:5000/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.user) {
            // Store user info in localStorage
            localStorage.setItem("auth_user", JSON.stringify(data.user));
            // Signal same-tab auth update for provider
            window.dispatchEvent(new Event("auth:update"));
            // Auth state will be picked up by provider
            toast.success("Logged in successfully with Google!");

            // Redirect based on role
            const role = data.user.role;
            if (role === "admin" || role === "staff") {
              router.push("/admin");
            } else {
              router.push("/home");
            }
          } else {
            throw new Error("Failed to get user info");
          }
        })
        .catch((err) => {
          console.error("Error fetching user info:", err);
          toast.error("Authentication failed");
          router.push("/");
        });
    } else {
      toast.error("No authentication token received");
      router.push("/");
    }
  }, [searchParams, router, logout]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">
          Completing Google sign in...
        </p>
      </div>
    </div>
  );
}
