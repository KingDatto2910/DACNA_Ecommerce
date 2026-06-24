"use client";

import { useEffect, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Permission, hasPermission } from "@/lib/permissions";
import { AlertCircle } from "lucide-react";

/**
 * AdminProtectedRoute Component
 *
 * Wraps admin pages to ensure only authorized users can access them.
 * Provides different levels of protection based on permissions.
 *
 * FEATURES:
 * - Redirects unauthenticated users to login page
 * - Redirects customers (non-admin/staff) to homepage
 * - Can optionally check for specific permissions (e.g., only admin can manage users)
 * - Shows loading state while checking authentication
 * - Shows permission denied message if user lacks required permissions
 *
 * USAGE:
 * // Protect route for any admin/staff
 * <AdminProtectedRoute>
 *   <YourComponent />
 * </AdminProtectedRoute>
 *
 * // Protect route for specific permission (e.g., only admins can view users)
 * <AdminProtectedRoute requiredPermission={Permission.VIEW_USERS}>
 *   <UsersManagementComponent />
 * </AdminProtectedRoute>
 */

interface AdminProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: Permission; // Optional: require specific permission
  fallback?: ReactNode; // Optional: custom component to show if permission denied
}

export default function AdminProtectedRoute({
  children,
  requiredPermission,
  fallback,
}: AdminProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, isAdminOrStaff } = useAuth();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [checkingAdminSession, setCheckingAdminSession] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

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

    setCheckingAdminSession(false);
  }, []);

  const hasAdminSession = !!(adminToken && adminUser);
  const effectiveUser = hasAdminSession ? adminUser : user;
  const effectiveIsAuthenticated = hasAdminSession || isAuthenticated;
  const effectiveIsAdminOrStaff =
    (hasAdminSession &&
      (adminUser?.role === "admin" || adminUser?.role === "staff")) ||
    isAdminOrStaff;

  useEffect(() => {
    // Wait for both auth checks to complete
    if (isLoading || checkingAdminSession) return;

    // Redirect to login-selection if no session at all
    if (!effectiveIsAuthenticated) {
      router.push("/login-selection?redirect=admin");
      return;
    }

    // Redirect to home if user is not admin or staff
    if (!effectiveIsAdminOrStaff) {
      router.push("/home");
      return;
    }
  }, [
    checkingAdminSession,
    effectiveIsAdminOrStaff,
    effectiveIsAuthenticated,
    isLoading,
    router,
  ]);

  // Show loading spinner while checking authentication
  if (isLoading || checkingAdminSession) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show loading if not authenticated or not admin/staff (while redirecting)
  if (!effectiveIsAuthenticated || !effectiveIsAdminOrStaff) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Check for specific permission if required
  if (requiredPermission && effectiveUser) {
    const hasRequiredPermission = hasPermission(
      effectiveUser.role,
      requiredPermission
    );

    if (!hasRequiredPermission) {
      // Show custom fallback or default permission denied message
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div className="flex h-screen items-center justify-center p-4">
          <div className="max-w-md w-full bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-destructive mb-2">
                Access Denied
              </h2>
              <p className="text-muted-foreground">
                You don&apos;t have permission to access this page.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Required role: <span className="font-semibold">Admin</span>
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={() => router.push("/admin")}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // User is authenticated, has admin/staff role, and required permission (if any)
  return <>{children}</>;
}
