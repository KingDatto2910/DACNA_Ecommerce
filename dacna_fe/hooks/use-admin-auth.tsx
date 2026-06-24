"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";

/**
 * Custom hook for admin pages that checks both localStorage (regular user)
 * and sessionStorage (admin session) for authentication.
 *
 * Admin login uses sessionStorage, so admin pages must check both sources.
 *
 * @returns Effective user, role checks, and loading state
 */
export function useAdminAuth() {
  const { user, isAdmin, isAdminOrStaff, isStaff, isLoading } = useAuth();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const adminUserStr = sessionStorage.getItem("admin_auth_user");
      if (adminUserStr) {
        try {
          setAdminUser(JSON.parse(adminUserStr));
        } catch {
          setAdminUser(null);
        }
      }
      setCheckingSession(false);
    }
  }, []);

  // Determine effective values (admin session takes priority)
  const effectiveUser = adminUser || user;
  const effectiveIsAdmin = (adminUser && adminUser.role === "admin") || isAdmin;
  const effectiveIsStaff = (adminUser && adminUser.role === "staff") || isStaff;
  const effectiveIsAdminOrStaff =
    (adminUser && (adminUser.role === "admin" || adminUser.role === "staff")) ||
    isAdminOrStaff;

  return {
    user: effectiveUser,
    isAdmin: effectiveIsAdmin,
    isStaff: effectiveIsStaff,
    isAdminOrStaff: effectiveIsAdminOrStaff,
    isLoading: isLoading || checkingSession,
  };
}
