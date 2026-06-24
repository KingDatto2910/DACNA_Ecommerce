import { getAuthToken } from "./auth-token";

const API_BASE = "http://localhost:5000";

// Helper to get auth token (checks both admin and user sessions)
const getAuthHeader = (): Record<string, string> => {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function handleAuthStatus(res: Response, body: any) {
  if (res.status === 401 || res.status === 403) {
    const msg = body?.message || body?.error || "UNAUTHORIZED";
    const detail = /expired/i.test(msg) ? "TOKEN_EXPIRED" : "UNAUTHORIZED";
    // Proactively clear both admin and user tokens to avoid repeated malformed JWT requests
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("admin_jwt_token");
      sessionStorage.removeItem("admin_auth_user");
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("auth_user");
    }
    window.dispatchEvent(new CustomEvent("auth:logout", { detail }));
    throw new Error(detail);
  }
}

/* ==================== ORDERS API ==================== */

export interface AdminOrder {
  id: number;
  order_code: string;
  user_id: number | null;
  guest_email: string | null;
  order_status: string;
  payment_status: string;
  total_amount: number;
  shipping_address: string;
  created_at: string;
  updated_at: string;
  username?: string;
  email?: string;
}

export interface AdminOrderDetail extends AdminOrder {
  items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    product_sku: string;
    product_thumbnail: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  user?: {
    id: number;
    username: string;
    email: string;
    phone: string;
  };
}

export interface CancelRequest {
  id: number;
  order_id: number;
  user_id: number;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  admin_note: string | null;
  reviewed_by: number | null;
  created_at: string;
  updated_at: string;
  order_code?: string;
  username?: string;
  email?: string;
}

export interface OrdersListResponse {
  ok: boolean;
  data: AdminOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchAllOrders(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_dir?: "ASC" | "DESC";
}): Promise<OrdersListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.search) query.append("search", params.search);
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.date_from) query.append("date_from", params.date_from);
  if (params?.date_to) query.append("date_to", params.date_to);
  if (params?.sort_by) query.append("sort_by", params.sort_by);
  if (params?.sort_dir) query.append("sort_dir", params.sort_dir);

  const res = await fetch(`${API_BASE}/api/orders/admin?${query}`, {
    headers: getAuthHeader(),
  });
  const j = await safeJson(res);
  handleAuthStatus(res, j);
  if (!res.ok) {
    let msg = `Failed to fetch orders (${res.status})`;
    msg = j?.message || j?.error || msg;
    throw new Error(msg);
  }
  // Backend shape: { ok: true, data: { orders, pagination } }
  const orders = (j?.data?.orders || []) as any[];
  const mapped: AdminOrder[] = orders.map((o) => ({
    id: o.id,
    order_code: o.order_code,
    user_id: o.user_id ?? null,
    guest_email: null,
    order_status: o.order_status,
    payment_status: o.payment_status || "",
    total_amount: Number(o.grand_total ?? 0),
    shipping_address: "",
    created_at: o.created_at,
    updated_at: o.updated_at,
    username: o.username,
    email: o.email,
  }));
  return {
    ok: true,
    data: mapped,
    pagination: j?.data?.pagination ?? {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      total: mapped.length,
      totalPages: 1,
    },
  };
}

export async function fetchOrderDetail(
  orderId: number
): Promise<{ ok: boolean; data: AdminOrderDetail }> {
  const res = await fetch(`${API_BASE}/api/orders/admin/${orderId}`, {
    headers: getAuthHeader(),
  });
  const j = await safeJson(res);
  handleAuthStatus(res, j);
  if (!res.ok) throw new Error(j?.message || "Failed to fetch order detail");
  return j;
}

export async function updateOrderStatus(
  orderId: number,
  status: string
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ order_status: status }),
  });
  const j = await safeJson(res);
  handleAuthStatus(res, j);
  if (!res.ok) throw new Error(j?.message || "Failed to update order status");
  return j;
}

export async function fetchCancelRequests(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: CancelRequest[]; pagination: any }> {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  const res = await fetch(
    `${API_BASE}/api/orders/admin/cancel-requests?${query}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    }
  );
  const j = await safeJson(res);
  handleAuthStatus(res, j);
  if (!res.ok) {
    if (res.status === 404) {
      // Treat not found as empty list (no noisy logging)
      return {
        data: [],
        pagination: { page: params?.page || 1, totalPages: 1, total: 0 },
      };
    }
    console.error("Admin API fetchCancelRequests failed", {
      status: res.status,
      statusText: res.statusText,
      body: j,
    });
    throw new Error(
      j?.message ||
        j?.error ||
        res.statusText ||
        "Failed to fetch cancel requests"
    );
  }
  // Accept both { ok, data } and raw array responses
  const arr: CancelRequest[] = Array.isArray(j?.data)
    ? (j.data as CancelRequest[])
    : Array.isArray(j)
    ? (j as unknown as CancelRequest[])
    : [];
  return {
    data: arr,
    pagination: { page: params?.page || 1, totalPages: 1, total: arr.length },
  };
}

export async function approveCancelRequest(
  requestId: number,
  adminNote?: string,
  orderId?: number
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(
    `${API_BASE}/api/orders/admin/cancel-requests/${requestId}/approve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      // Backend requires order_id in body
      body: JSON.stringify({ admin_note: adminNote, order_id: orderId }),
    }
  );
  const j = await safeJson(res);
  handleAuthStatus(res, j);
  if (!res.ok || !j?.ok)
    throw new Error(j?.message || "Failed to approve cancel request");
  return j;
}

export async function rejectCancelRequest(
  requestId: number,
  adminNote?: string
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(
    `${API_BASE}/api/orders/admin/cancel-requests/${requestId}/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ admin_note: adminNote }),
    }
  );
  const j = await safeJson(res);
  handleAuthStatus(res, j);
  if (!res.ok || !j?.ok)
    throw new Error(j?.message || "Failed to reject cancel request");
  return j;
}

/* ==================== PRODUCTS API ==================== */

export interface AdminProduct {
  id: number;
  sku: string;
  name: string;
  model?: string;
  description?: string;
  price: number;
  sale_price?: number;
  category_id: number;
  sub_category_id?: number;
  stock_qty: number;
  is_trending: boolean;
  is_bestseller: boolean;
  average_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  sku: string;
  name: string;
  model?: string;
  description?: string;
  price: number;
  sale_price?: number;
  category_id: number;
  sub_category_id?: number;
  stock_qty?: number;
  is_trending?: boolean;
  is_bestseller?: boolean;
  specifications?: Array<{ key: string; value: string }>;
  images?: string[];
}

export async function createProduct(
  data: CreateProductData
): Promise<{ ok: boolean; message: string; data: { productId: number } }> {
  const res = await fetch(`${API_BASE}/api/products/admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create product");
  return res.json();
}

export async function updateProduct(
  productId: number,
  data: Partial<CreateProductData>
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/products/admin/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update product");
  return res.json();
}

export async function deleteProduct(
  productId: number
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/products/admin/${productId}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });

  const j = await safeJson(res);
  handleAuthStatus(res, j);

  if (!res.ok) {
    let msg = `Failed to delete product (${res.status})`;
    msg = j?.message || j?.error || msg;
    throw new Error(msg);
  }

  return j || { ok: true, message: "Product deleted successfully" };
}

export async function reviveProduct(
  productId: number
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/products/admin/${productId}/revive`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
  });

  const j = await safeJson(res);
  handleAuthStatus(res, j);

  if (!res.ok) {
    let msg = `Failed to revive product (${res.status})`;
    msg = j?.message || j?.error || msg;
    throw new Error(msg);
  }

  return j || { ok: true, message: "Product revived successfully" };
}

export async function getDeletedProducts(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/products/admin/deleted`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
  });

  const j = await safeJson(res);
  handleAuthStatus(res, j);

  if (!res.ok) {
    let msg = `Failed to get deleted products (${res.status})`;
    msg = j?.message || j?.error || msg;
    throw new Error(msg);
  }

  return j?.data || [];
}

export async function updateProductStock(
  productId: number,
  stock_qty: number
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/products/admin/${productId}/stock`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ stock_qty }),
  });
  if (!res.ok) throw new Error("Failed to update stock");
  return res.json();
}

/* ==================== CATEGORIES API ==================== */

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminSubCategory {
  id: number;
  parent_category_id: number;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
}): Promise<{ ok: boolean; message: string; data: { categoryId: number } }> {
  const res = await fetch(`${API_BASE}/api/categories/admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create category");
  return res.json();
}

export async function updateCategory(
  categoryId: number,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    image_url: string;
  }>
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/categories/admin/${categoryId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update category");
  return res.json();
}

export async function deleteCategory(
  categoryId: number
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/categories/admin/${categoryId}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Failed to delete category");
  return res.json();
}

export async function createSubCategory(
  categoryId: number,
  data: {
    name: string;
    slug: string;
    description?: string;
  }
): Promise<{ ok: boolean; message: string; data: { subCategoryId: number } }> {
  const res = await fetch(
    `${API_BASE}/api/categories/admin/${categoryId}/subcategories`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) throw new Error("Failed to create subcategory");
  return res.json();
}

export async function updateSubCategory(
  categoryId: number,
  subCategoryId: number,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
  }>
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(
    `${API_BASE}/api/categories/admin/${categoryId}/subcategories/${subCategoryId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) throw new Error("Failed to update subcategory");
  return res.json();
}

export async function deleteSubCategory(
  categoryId: number,
  subCategoryId: number
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(
    `${API_BASE}/api/categories/admin/${categoryId}/subcategories/${subCategoryId}`,
    {
      method: "DELETE",
      headers: getAuthHeader(),
    }
  );
  if (!res.ok) throw new Error("Failed to delete subcategory");
  return res.json();
}

/* ==================== USERS API ==================== */

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  phone?: string;
  roles: "admin" | "staff" | "customer";
  verified: boolean;
  full_name?: string;
  address_city?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UsersListResponse {
  ok: boolean;
  data: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchAllUsers(params?: {
  role?: string;
  search?: string;
  verified?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: "ASC" | "DESC";
}): Promise<UsersListResponse> {
  const query = new URLSearchParams();
  if (params?.role) query.append("role", params.role);
  if (params?.search) query.append("search", params.search);
  if (params?.verified !== undefined)
    query.append("verified", params.verified.toString());
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.sort_by) query.append("sort_by", params.sort_by);
  if (params?.sort_dir) query.append("sort_dir", params.sort_dir);

  const res = await fetch(`${API_BASE}/api/users/admin?${query}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function fetchUserById(
  userId: number
): Promise<{ ok: boolean; data: AdminUser }> {
  const res = await fetch(`${API_BASE}/api/users/admin/${userId}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export async function updateUser(
  userId: number,
  data: Partial<{
    roles: string;
    verified: boolean;
    username: string;
    email: string;
    phone: string;
    full_name: string;
  }>
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/users/admin/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update user");
  return res.json();
}

export async function createUser(data: {
  username: string;
  email: string;
  password: string;
  roles?: "admin" | "staff" | "customer";
  verified?: boolean;
  phone?: string;
  full_name?: string;
}): Promise<{ ok: boolean; message: string; data: { userId: number } }> {
  const res = await fetch(`${API_BASE}/api/users/admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let msg = `Failed to create user (${res.status})`;
    try {
      const j = await res.json();
      msg = j?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function deleteUser(
  userId: number
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/users/admin/${userId}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Failed to delete user");
  return res.json();
}

/* ==================== REVIEWS API ==================== */

export interface AdminReview {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  title?: string;
  comment: string;
  admin_reply?: string;
  admin_reply_at?: string;
  is_verified_purchase: boolean;
  created_at: string;
  updated_at: string;
  username: string;
  email: string;
  product_name: string;
  product_sku: string;
}

export interface ReviewsListResponse {
  ok: boolean;
  data: AdminReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchAllReviews(params?: {
  product_id?: number;
  rating?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: "ASC" | "DESC";
}): Promise<ReviewsListResponse> {
  const query = new URLSearchParams();
  if (params?.product_id)
    query.append("product_id", params.product_id.toString());
  if (params?.rating) query.append("rating", params.rating.toString());
  if (params?.search) query.append("search", params.search);
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.sort_by) query.append("sort_by", params.sort_by);
  if (params?.sort_dir) query.append("sort_dir", params.sort_dir);

  const res = await fetch(`${API_BASE}/api/reviews/admin?${query}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json();
}

export async function deleteReview(
  reviewId: number
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/reviews/admin/${reviewId}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Failed to delete review");
  return res.json();
}

export async function updateReviewReply(
  reviewId: number,
  admin_reply: string
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/reviews/admin/${reviewId}/reply`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ admin_reply }),
  });
  if (!res.ok) throw new Error("Failed to save reply");
  return res.json();
}

/* ==================== PROMOTIONS API ==================== */

export interface AdminPromotion {
  id: number;
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  usage_limit?: number;
  usage_count: number;
  per_user_limit?: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  category_id?: number;
  sub_category_id?: number;
  created_at: string;
  updated_at: string;
}

export interface PromotionsListResponse {
  ok: boolean;
  data: AdminPromotion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchAllPromotions(params?: {
  is_active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: "ASC" | "DESC";
}): Promise<PromotionsListResponse> {
  const query = new URLSearchParams();
  if (params?.is_active !== undefined)
    query.append("is_active", params.is_active.toString());
  if (params?.search) query.append("search", params.search);
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.sort_by) query.append("sort_by", params.sort_by);
  if (params?.sort_dir) query.append("sort_dir", params.sort_dir);

  const res = await fetch(`${API_BASE}/api/promotions/admin?${query}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Failed to fetch promotions");
  return res.json();
}

export async function createPromotion(data: {
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  usage_limit?: number;
  per_user_limit?: number;
  start_date: string;
  end_date: string;
  is_active?: boolean;
  category_id?: number;
  sub_category_id?: number;
}): Promise<{ ok: boolean; message: string; data: { promotionId: number } }> {
  const res = await fetch(`${API_BASE}/api/promotions/admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create promotion");
  return res.json();
}

export async function updatePromotion(
  promotionId: number,
  data: Partial<{
    code: string;
    description: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    min_order_amount: number;
    max_discount_amount: number;
    usage_limit: number;
    per_user_limit: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    category_id: number;
    sub_category_id: number;
  }>
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/promotions/admin/${promotionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update promotion");
  return res.json();
}

export async function deletePromotion(
  promotionId: number
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/promotions/admin/${promotionId}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Failed to delete promotion");
  return res.json();
}

/* ==================== STATISTICS API (for dashboard) ==================== */

export interface DashboardStats {
  revenue: {
    total: number;
    trend: string;
  };
  orders: {
    total: number;
    pending: number;
    trend: string;
  };
  products: {
    total: number;
    lowStock: number;
  };
  users: {
    total: number;
    newThisMonth: number;
  };
}

// This would need a dedicated backend endpoint, for now return mock
export async function fetchDashboardStats(): Promise<DashboardStats> {
  // TODO: Implement backend endpoint /api/admin/stats
  return {
    revenue: { total: 0, trend: "+0%" },
    orders: { total: 0, pending: 0, trend: "+0%" },
    products: { total: 0, lowStock: 0 },
    users: { total: 0, newThisMonth: 0 },
  };
}
