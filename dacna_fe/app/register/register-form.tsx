"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

/**
 * RegisterForm - Form đăng ký với redirect logic
 * Chức năng: Xử lý đăng ký và tự động redirect nếu đã authenticated
 * 
 * ROLE-BASED REDIRECT:
 * - Admin/Staff users → redirect to /admin (admin dashboard)
 * - Customer users → redirect to /home (customer homepage)
 */
export default function RegisterForm() {
  const { register, isLoading, isAuthenticated, user, isAdminOrStaff } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Redirect based on role if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Check user role and redirect accordingly
      if (isAdminOrStaff) {
        router.push("/admin");
      } else {
        router.push("/home");
      }
    }
  }, [isAuthenticated, isLoading, isAdminOrStaff, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await register({ name, email, password });
    } catch (err: any) {
      setError(err.message || "An unknown error occurred");
    }
  };

  return (
    <div className="flex items-center justify-center py-12 md:py-24 lg:py-32">
      <form onSubmit={handleRegister} className="w-full max-w-lg">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create an Account</CardTitle>
            <CardDescription>
              Enter your details below to create your account.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Hiển thị lỗi từ API */}
            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Sign Up"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?
              {/* Sửa Link href="/", là trang Login*/}
              <Link href="/" className="underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
