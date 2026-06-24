"use client";

import { useEffect } from "react";
import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  MessageSquare,
  LogOut,
  Menu,
  Headphones,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Permission, hasPermission } from "@/lib/permissions";

/**
 * Admin Layout
 *
 * FEATURES:
 * - Route protection: only admin and staff can access /admin routes
 * - Dynamic menu rendering based on user permissions
 * - Staff users cannot see "Users" menu item (admin only)
 * - Responsive sidebar with mobile sheet menu
 * - User info display with role badge
 *
 * PERMISSION SYSTEM:
 * - Admin: Full access to all menu items including Users
 * - Staff: Access to Products, Categories, Orders, Reviews (NO Users menu)
 * - Customer: Redirected to /home (cannot access admin panel)
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, isAdminOrStaff, logout, isAdmin } =
    useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Get admin user info from sessionStorage
  const [adminUser, setAdminUser] = React.useState<any>(null);
  const [adminToken, setAdminToken] = React.useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = React.useState(true);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const token = sessionStorage.getItem("admin_jwt_token");
      const adminUserStr = sessionStorage.getItem("admin_auth_user");

      setAdminToken(token);

      if (adminUserStr) {
        try {
          setAdminUser(JSON.parse(adminUserStr));
        } catch {
          setAdminUser(null);
        }
      }
      setCheckingAuth(false);
    }
  }, []);

  const displayUser = adminUser || user;
  const isAdminSession = !!(adminToken && adminUser);

  // Check authentication và role
  useEffect(() => {
    if (checkingAuth) return; // Wait for admin session check

    // If admin session exists, allow access
    if (isAdminSession) {
      return;
    }

    // No admin session, check regular user session
    if (!isLoading) {
      if (!isAuthenticated) {
        // Not logged in at all → redirect to admin login
        router.push("/admin-login");
        return;
      }

      if (!isAdminOrStaff) {
        // User is customer → redirect to home
        router.push("/home");
        return;
      }
    }
  }, [
    isAdminSession,
    isAuthenticated,
    isAdminOrStaff,
    isLoading,
    checkingAuth,
    router,
  ]);

  // Show loading while checking auth
  if (checkingAuth || (!isAdminSession && isLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show loading if no valid session
  if (!isAdminSession && (!isAuthenticated || !isAdminOrStaff)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Define all menu items with permission requirements
  const allMenuItems = [
    {
      href: "/admin",
      label: "Overview",
      icon: LayoutDashboard,
      permission: Permission.VIEW_DASHBOARD,
    },
    {
      href: "/admin/analytics",
      label: "Analytics",
      icon: LayoutDashboard,
      permission: Permission.VIEW_DASHBOARD,
    },
    {
      href: "/admin/products",
      label: "Products",
      icon: Package,
      permission: Permission.VIEW_PRODUCTS,
    },
    {
      href: "/admin/categories",
      label: "Categories",
      icon: FolderTree,
      permission: Permission.VIEW_CATEGORIES,
    },
    {
      href: "/admin/orders",
      label: "Orders",
      icon: ShoppingCart,
      permission: Permission.VIEW_ORDERS,
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: Users,
      permission: Permission.VIEW_USERS, // ADMIN ONLY
      adminOnly: true, // Flag to indicate this is admin-only
    },
    {
      href: "/admin/reviews",
      label: "Reviews",
      icon: MessageSquare,
      permission: Permission.VIEW_REVIEWS,
    },
    {
      href: "/admin/chat",
      label: "Chat",
      icon: Headphones,
      permission: Permission.VIEW_ORDERS, // Staff and admin can view chat
    },
    {
      href: "/admin/support",
      label: "Support",
      icon: Headphones,
      permission: Permission.VIEW_ORDERS, // Staff and admin can view support
    },
    {
      href: "/admin/promotions",
      label: "Promotions",
      icon: Package,
      permission: Permission.VIEW_PROMOTIONS,
    },
  ];

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter((item) =>
    hasPermission(displayUser?.role, item.permission)
  );

  const handleLogout = () => {
    // Check if admin session exists
    if (isAdminSession) {
      // Clear admin session
      sessionStorage.removeItem("admin_jwt_token");
      sessionStorage.removeItem("admin_auth_user");
      setAdminToken(null);
      setAdminUser(null);
      router.push("/admin-login");
    } else {
      // Use regular logout
      logout();
    }
  };

  const Sidebar = () => (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <LayoutDashboard className="h-6 w-6" />
          <span>Admin Panel</span>
        </Link>
      </div>
      <div className="flex-1 px-3 py-4">
        <nav className="grid gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent ${
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {displayUser?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1">
            <p
              className="text-sm font-medium truncate"
              title={displayUser?.name}
            >
              {displayUser?.name}
            </p>
            <p
              className={`text-xs font-semibold uppercase ${
                displayUser?.role === "admin"
                  ? "text-red-600 dark:text-red-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            >
              {displayUser?.role}
            </p>
          </div>
        </div>
        <div className="flex">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Desktop Sidebar */}
      <div className="hidden border-r bg-muted/40 md:block">
        <Sidebar />
      </div>

      <div className="flex flex-col">
        {/* Mobile Header */}
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>
          <div className="flex-1 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Admin Panel</h1>
            <div className="flex items-center">
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
