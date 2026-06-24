/**
 * Role-Based Permission System
 * 
 * This file defines all permissions and roles for the admin panel.
 * It provides utility functions to check user permissions for different actions.
 * 
 * ROLES:
 * - admin: Full access to all features including user management
 * - staff: Access to products, categories, orders, and reviews (NO user management)
 * - customer: Regular user, no admin access
 */

// Define all possible roles
export type UserRole = "admin" | "staff" | "customer";

// Define all available permissions in the system
export enum Permission {
  // Dashboard permissions
  VIEW_DASHBOARD = "view_dashboard",
  VIEW_ANALYTICS = "view_analytics",

  // Product permissions
  VIEW_PRODUCTS = "view_products",
  CREATE_PRODUCT = "create_product",
  EDIT_PRODUCT = "edit_product",
  DELETE_PRODUCT = "delete_product",
  MANAGE_STOCK = "manage_stock",

  // Category permissions
  VIEW_CATEGORIES = "view_categories",
  CREATE_CATEGORY = "create_category",
  EDIT_CATEGORY = "edit_category",
  DELETE_CATEGORY = "delete_category",

  // Order permissions
  VIEW_ORDERS = "view_orders",
  EDIT_ORDER = "edit_order",
  UPDATE_ORDER_STATUS = "update_order_status",
  DELETE_ORDER = "delete_order",

  // Review permissions
  VIEW_REVIEWS = "view_reviews",
  DELETE_REVIEW = "delete_review",
  RESPOND_REVIEW = "respond_review",

  // User management permissions (ADMIN ONLY)
  VIEW_USERS = "view_users",
  CREATE_USER = "create_user",
  EDIT_USER = "edit_user",
  DELETE_USER = "delete_user",
  CHANGE_USER_ROLE = "change_user_role",
  // Promotions permissions
  VIEW_PROMOTIONS = "view_promotions",
  CREATE_PROMOTION = "create_promotion",
  EDIT_PROMOTION = "edit_promotion",
  DELETE_PROMOTION = "delete_promotion",
}

/**
 * Role-Permission mapping
 * Defines what permissions each role has
 */
const rolePermissions: Record<UserRole, Permission[]> = {
  // Admin has ALL permissions
  admin: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_PRODUCTS,
    Permission.CREATE_PRODUCT,
    Permission.EDIT_PRODUCT,
    Permission.DELETE_PRODUCT,
    Permission.MANAGE_STOCK,
    Permission.VIEW_CATEGORIES,
    Permission.CREATE_CATEGORY,
    Permission.EDIT_CATEGORY,
    Permission.DELETE_CATEGORY,
    Permission.VIEW_ORDERS,
    Permission.EDIT_ORDER,
    Permission.UPDATE_ORDER_STATUS,
    Permission.DELETE_ORDER,
    Permission.VIEW_REVIEWS,
    Permission.DELETE_REVIEW,
    Permission.RESPOND_REVIEW,
    Permission.VIEW_USERS,
    Permission.CREATE_USER,
    Permission.EDIT_USER,
    Permission.DELETE_USER,
    Permission.CHANGE_USER_ROLE,
    Permission.VIEW_PROMOTIONS,
    Permission.CREATE_PROMOTION,
    Permission.EDIT_PROMOTION,
    Permission.DELETE_PROMOTION,
  ],

  // Staff has access to products, categories, orders, and reviews
  // NO access to user management
  staff: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_PRODUCTS,
    Permission.CREATE_PRODUCT,
    Permission.EDIT_PRODUCT,
    Permission.DELETE_PRODUCT,
    Permission.MANAGE_STOCK,
    Permission.VIEW_CATEGORIES,
    Permission.CREATE_CATEGORY,
    Permission.EDIT_CATEGORY,
    Permission.DELETE_CATEGORY,
    Permission.VIEW_ORDERS,
    Permission.EDIT_ORDER,
    Permission.UPDATE_ORDER_STATUS,
    Permission.DELETE_ORDER,
    Permission.VIEW_REVIEWS,
    Permission.DELETE_REVIEW,
    Permission.RESPOND_REVIEW,
    Permission.VIEW_PROMOTIONS,
    Permission.CREATE_PROMOTION,
    Permission.EDIT_PROMOTION,
    Permission.DELETE_PROMOTION,
  ],

  // Customer has no admin permissions
  customer: [],
};

/**
 * Check if a role has a specific permission
 * @param role - User role to check
 * @param permission - Permission to verify
 * @returns true if role has the permission, false otherwise
 */
export function hasPermission(
  role: UserRole | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  return rolePermissions[role]?.includes(permission) || false;
}

/**
 * Check if a role has ANY of the specified permissions
 * @param role - User role to check
 * @param permissions - Array of permissions to check
 * @returns true if role has at least one permission, false otherwise
 */
export function hasAnyPermission(
  role: UserRole | undefined,
  permissions: Permission[]
): boolean {
  if (!role) return false;
  return permissions.some((perm) => hasPermission(role, perm));
}

/**
 * Check if a role has ALL of the specified permissions
 * @param role - User role to check
 * @param permissions - Array of permissions to check
 * @returns true if role has all permissions, false otherwise
 */
export function hasAllPermissions(
  role: UserRole | undefined,
  permissions: Permission[]
): boolean {
  if (!role) return false;
  return permissions.every((perm) => hasPermission(role, perm));
}

/**
 * Check if user can access admin panel
 * @param role - User role to check
 * @returns true if user is admin or staff, false otherwise
 */
export function canAccessAdmin(role: UserRole | undefined): boolean {
  return role === "admin" || role === "staff";
}

/**
 * Check if user is admin (full permissions)
 * @param role - User role to check
 * @returns true if user is admin, false otherwise
 */
export function isAdmin(role: UserRole | undefined): boolean {
  return role === "admin";
}

/**
 * Check if user is staff (limited permissions)
 * @param role - User role to check
 * @returns true if user is staff, false otherwise
 */
export function isStaff(role: UserRole | undefined): boolean {
  return role === "staff";
}

/**
 * Get all permissions for a role
 * @param role - User role
 * @returns Array of permissions for the role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Get user-friendly permission name
 * @param permission - Permission enum
 * @returns Human-readable permission name
 */
export function getPermissionLabel(permission: Permission): string {
  const labels: Record<Permission, string> = {
    [Permission.VIEW_DASHBOARD]: "View Dashboard",
    [Permission.VIEW_ANALYTICS]: "View Analytics",
    [Permission.VIEW_PRODUCTS]: "View Products",
    [Permission.CREATE_PRODUCT]: "Create Products",
    [Permission.EDIT_PRODUCT]: "Edit Products",
    [Permission.DELETE_PRODUCT]: "Delete Products",
    [Permission.MANAGE_STOCK]: "Manage Stock",
    [Permission.VIEW_CATEGORIES]: "View Categories",
    [Permission.CREATE_CATEGORY]: "Create Categories",
    [Permission.EDIT_CATEGORY]: "Edit Categories",
    [Permission.DELETE_CATEGORY]: "Delete Categories",
    [Permission.VIEW_ORDERS]: "View Orders",
    [Permission.EDIT_ORDER]: "Edit Orders",
    [Permission.UPDATE_ORDER_STATUS]: "Update Order Status",
    [Permission.DELETE_ORDER]: "Delete Orders",
    [Permission.VIEW_REVIEWS]: "View Reviews",
    [Permission.DELETE_REVIEW]: "Delete Reviews",
    [Permission.RESPOND_REVIEW]: "Respond to Reviews",
    [Permission.VIEW_USERS]: "View Users",
    [Permission.CREATE_USER]: "Create Users",
    [Permission.EDIT_USER]: "Edit Users",
    [Permission.DELETE_USER]: "Delete Users",
    [Permission.CHANGE_USER_ROLE]: "Change User Roles",
    [Permission.VIEW_PROMOTIONS]: "View Promotions",
    [Permission.CREATE_PROMOTION]: "Create Promotions",
    [Permission.EDIT_PROMOTION]: "Edit Promotions",
    [Permission.DELETE_PROMOTION]: "Delete Promotions",
  };
  return labels[permission] || permission;
}
