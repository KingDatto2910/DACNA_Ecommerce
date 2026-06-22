"use client";

import { useState, useEffect, Suspense } from "react";
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
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleProfile, setGoogleProfile] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if coming from Google OAuth (new user)
    const googleData = searchParams.get("google");
    if (googleData) {
      try {
        const decoded = JSON.parse(
          Buffer.from(decodeURIComponent(googleData), "base64").toString()
        );
        setGoogleProfile(decoded);
      } catch (e) {
        console.error("Failed to decode Google data:", e);
        toast.error("Invalid registration data");
        router.push("/");
      }
    } else {
      // Check if authenticated (existing user)
      const token = localStorage.getItem("jwt_token");
      if (token) {
        setIsAuthenticated(true);
      } else {
        toast.error("Not authenticated");
        router.push("/");
      }
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("jwt_token");
      const headers: any = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const body: any = { password };

      // If from Google registration, include profile data
      if (googleProfile) {
        body.email = googleProfile.email;
        body.googleProfile = googleProfile;
      }

      const response = await fetch(
        "http://localhost:5000/api/users/set-password",
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Failed to set password");
      }

      toast.success(
        googleProfile
          ? "Account created successfully!"
          : "Password set successfully!"
      );

      // If new registration, store token
      if (data.token) {
        localStorage.setItem("jwt_token", data.token);
        localStorage.setItem("auth_user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("storage"));
      }

      router.push("/home");
    } catch (error: any) {
      console.error("Set password error:", error);
      toast.error(error.message || "Failed to set password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>
            {googleProfile ? "Complete Your Registration" : "Set Your Password"}
          </CardTitle>
          <CardDescription>
            {googleProfile
              ? `Create a password for ${googleProfile.email}. You can use this to log in without Google.`
              : "Please create a password for your account. You can use this to log in without Google."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {googleProfile && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Email:</strong> {googleProfile.email}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Name:</strong> {googleProfile.displayName || "User"}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min 6 characters)"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {googleProfile
                    ? "Creating Account..."
                    : "Setting Password..."}
                </>
              ) : googleProfile ? (
                "Create Account"
              ) : (
                "Set Password"
              )}
            </Button>

            {!googleProfile && (
              <>
                <p className="text-xs text-center text-muted-foreground">
                  You can skip this for now, but setting a password allows you
                  to log in without Google.
                </p>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push("/home")}
                  disabled={isLoading}
                >
                  Skip for now
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}
