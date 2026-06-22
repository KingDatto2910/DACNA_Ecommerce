// Helper to get the appropriate auth token
// Checks sessionStorage for admin token first, then localStorage for user token
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  // Check admin session first (sessionStorage)
  const adminToken = sessionStorage.getItem("admin_jwt_token");
  if (adminToken) return adminToken;

  // Fall back to user session (localStorage)
  const userToken = localStorage.getItem("jwt_token");
  return userToken;
}

// Get current user from either admin or user session
export function getCurrentUser(): any | null {
  if (typeof window === "undefined") return null;

  // Check admin session first
  const adminUserStr = sessionStorage.getItem("admin_auth_user");
  if (adminUserStr) {
    try {
      return JSON.parse(adminUserStr);
    } catch {
      return null;
    }
  }

  // Fall back to user session
  const userStr = localStorage.getItem("auth_user");
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  return null;
}
