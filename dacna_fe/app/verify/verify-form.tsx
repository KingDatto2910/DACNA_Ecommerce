"use client";

import { useState } from "react";
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
import { useAuth } from "@/hooks/use-auth"; //

// Form này nhận email từ Server Component cha
interface VerifyFormProps {
  email: string;
}

export default function VerifyForm({ email }: VerifyFormProps) {
  const { verifyOtp, isLoading } = useAuth(); //

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("OTP must be 6 digits.");
      return;
    }

    try {
      // Gọi hàm verifyOtp từ useAuth
      await verifyOtp(email, otp);
      // useAuth sẽ tự xử lý (toast, chuyển trang sang /login)
    } catch (err: any) {
      // Bắt lỗi (ví dụ: "OTP sai") và hiển thị
      setError(err.message || "An unknown error occurred");
    }
  };

  return (
    <div className="flex items-center justify-center py-12 md:py-24 lg:py-32">
      <form onSubmit={handleVerify} className="w-full max-w-lg">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              We've sent a 6-digit code to
              <br />
              <strong className="text-foreground">{email}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code (OTP)</Label>
              <Input
                id="otp"
                placeholder="123456"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={isLoading}
                maxLength={6}
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
                "Verify Account"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Didn't get a code? {/* (Nâng cao) Tạm thời link về trang Login */}
              <Link href="/" className="underline">
                Resend code
              </Link>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
