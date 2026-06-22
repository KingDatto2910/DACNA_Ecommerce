"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const API_URL = "http://localhost:5000";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server error. Please try again later.");
      }

      const data = await res.json();

      if (!data.ok || !data.token) {
        throw new Error(data.message || "Login failed");
      }

      // Check if user is admin or staff
      if (data.user.role !== "admin" && data.user.role !== "staff") {
        toast.error("Access denied. Admin or staff credentials required.");
        return;
      }

      // Store in sessionStorage (tab-specific, not persistent)
      sessionStorage.setItem("admin_jwt_token", data.token);
      sessionStorage.setItem(
        "admin_auth_user",
        JSON.stringify({
          id: data.user.id,
          name: data.user.username || data.user.name,
          email: data.user.email,
          role: data.user.role,
        })
      );

      // Dispatch custom event for admin auth update
      window.dispatchEvent(new Event("admin-auth:update"));

      toast.success("Admin login successful!");
      router.push("/admin");
    } catch (error: any) {
      console.error("Admin login error:", error);
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="space-y-4">
          <div className="mx-auto p-4 bg-blue-500/10 rounded-full w-fit">
            <ShieldCheck className="h-12 w-12 text-blue-500" />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl">Admin / Staff Login</CardTitle>
            <CardDescription>
              Enter your credentials to access the admin dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Button
              variant="ghost"
              onClick={() => router.push("/login-selection")}
              className="text-sm"
            >
              Back to login selection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
