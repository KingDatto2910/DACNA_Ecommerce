// dacna/app/account/account-client.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/breadcrumbs";
import {
  Loader2,
  LogOut,
  User,
  ShoppingBag,
  Heart,
  Headphones,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
// import { toast } from "sonner";

/**
 * Client Component (Được bảo vệ)
 * Trang chủ tài khoản với navigation đến các trang con
 */
export default function AccountClient() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const router = useRouter();

  // Đây là logic chính để "bảo vệ" route này
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
    // Redirect admin/staff to admin panel
    if (!isLoading && isAuthenticated && user) {
      if (user.role === "admin" || user.role === "staff") {
        router.push("/admin");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // ---- CÁC TRẠNG THÁI RENDER ----

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Breadcrumbs />
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">My Account</CardTitle>
          <CardDescription>
            Welcome back, <strong>{user.name}</strong>!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Info */}
          <div className="space-y-2">
            <p>
              <strong>Name:</strong> {user.name}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Role:</strong> {user.role}
            </p>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/account/profile">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">My Profile</h3>
                      <p className="text-sm text-muted-foreground">
                        View and edit your account information
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/account/orders">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <ShoppingBag className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">My Orders</h3>
                      <p className="text-sm text-muted-foreground">
                        View your order history and track purchases
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/account/favorites">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">My Favorites</h3>
                      <p className="text-sm text-muted-foreground">
                        Quickly access products you've saved
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/account/support">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Headphones className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Support Messages</h3>
                      <p className="text-sm text-muted-foreground">
                        View your contact history and admin replies
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="destructive" className="w-full" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
