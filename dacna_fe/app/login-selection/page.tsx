"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginSelectionPage() {
  const router = useRouter();

  // Check for existing user session (not admin)
  React.useEffect(() => {
    // Don't auto-redirect, just let them choose
    // User can re-login or switch between user/admin
  }, []);

  const handleUserLogin = () => {
    // Check if user is already logged in
    const userToken = localStorage.getItem("jwt_token");
    const userData = localStorage.getItem("auth_user");

    if (userToken && userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role === "customer") {
          // User already logged in, go to home
          router.push("/home");
          return;
        }
      } catch {
        // Invalid data, continue to login
      }
    }
    // Not logged in or invalid session, go to login
    router.push("/login?role=user");
  };

  const handleAdminLogin = () => {
    // Always go to admin login (session-based, no persistence)
    router.push("/admin-login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome to DACNA</h1>
          <p className="text-muted-foreground">
            Please select how you'd like to sign in
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* User Login */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
                <User className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Customer Login</CardTitle>
              <CardDescription>
                Access your account to shop, track orders, and manage your
                profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg" onClick={handleUserLogin}>
                Sign in as Customer
              </Button>
              <p className="text-sm text-center text-muted-foreground mt-4">
                Don't have an account?{" "}
                <a href="/register" className="text-primary hover:underline">
                  Register here
                </a>
              </p>
            </CardContent>
          </Card>

          {/* Admin/Staff Login */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-blue-500/10 rounded-full w-fit">
                <ShieldCheck className="h-12 w-12 text-blue-500" />
              </div>
              <CardTitle className="text-2xl">Admin / Staff Login</CardTitle>
              <CardDescription>
                Access the admin dashboard to manage products, orders, and users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
                onClick={handleAdminLogin}
              >
                Sign in as Admin/Staff
              </Button>
              <p className="text-sm text-center text-muted-foreground mt-4">
                Authorized personnel only
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-6">
          <Button variant="ghost" onClick={() => router.push("/home")}>
            Continue as Guest
          </Button>
        </div>
      </div>
    </div>
  );
}
