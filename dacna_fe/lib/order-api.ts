// dacna/lib/order-api.ts

import { CartItem } from "./types";

const API_URL = "http://localhost:5000";

/**
 * Định nghĩa kiểu dữ liệu cho Order
 */
export interface Order {
  id: number;
  order_code: string;
  order_status: string;
  subtotal: number;
  shipping_fee: number;
  grand_total: number;
  payment_status: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
  items?: CartItem[];
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
}

// Public tracking order item shape (from backend getOrderByCode)
export interface TrackedOrderItem {
  id: number;
  product_id: number;
  item_name_snapshot: string;
  unit_price: number;
  qty: number;
  amount: number;
}

export interface TrackedOrder {
  id: number;
  order_code: string;
  order_status: string;
  subtotal: number;
  shipping_fee: number;
  grand_total: number;
  payment_status: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
  user_id: number | null;
  address_street: string | null;
  address_district: string | null;
  address_ward: string | null;
  address_city: string | null;
  items: TrackedOrderItem[];
}

/**
 * Định nghĩa kiểu dữ liệu cho CreateOrderData
 */
export interface CreateOrderData {
  address_street: string;
  address_district?: string;
  address_ward?: string;
  address_city: string;
}

/**
 * Hàm fetch API cơ sở (có token)
 */
async function fetchApiWithToken<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (response.status === 401 || response.status === 403) {
      const body = await safeJson(response);
      const msg = body?.message || body?.error || "UNAUTHORIZED";
      if (/expired/i.test(msg)) {
        throw new Error("TOKEN_EXPIRED");
      }
      throw new Error("UNAUTHORIZED");
    }

    const data = await safeJson(response);
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || data?.error || "API request failed");
    }
    return data.data as T;
  } catch (err: any) {
    console.error(`API Error (Token) at ${path}:`, err);
    throw new Error(err.message || "API Network Error");
  }
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Public GET helper (no token)
async function fetchPublic<T>(path: string): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.message || data.error || "API request failed");
    }
    return data.data;
  } catch (err: any) {
    console.error(`Public API Error at ${path}:`, err);
    throw new Error(err.message || "API Network Error");
  }
}

/**
 * Hàm POST API cơ sở (có token)
 */
async function postApiWithToken<T, R>(
  path: string,
  token: string,
  body: T
): Promise<R> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || data.error || "API request failed");
    }

    return data.data || data;
  } catch (err: any) {
    console.error(`POST API Error (Token) at ${path}:`, err);
    throw new Error(err.message || "API Network Error");
  }
}

/**
 * Tạo đơn hàng mới từ giỏ hàng
 */
export async function apiCreateOrder(
  token: string,
  data: CreateOrderData
): Promise<Order> {
  // Filter out undefined values to prevent SQL binding errors
  const cleanData: Record<string, any> = {
    address_street: data.address_street,
    address_city: data.address_city,
  };

  if (data.address_district !== undefined && data.address_district !== "") {
    cleanData.address_district = data.address_district;
  }
  if (data.address_ward !== undefined && data.address_ward !== "") {
    cleanData.address_ward = data.address_ward;
  }

  return postApiWithToken<typeof cleanData, Order>(
    "/api/orders",
    token,
    cleanData
  );
}

/**
 * Checkout đơn hàng
 */
export async function apiCheckoutOrder(
  token: string,
  orderId: number,
  promotionCode?: string
): Promise<void> {
  const body: any = {};
  if (promotionCode) body.promotion_code = promotionCode.trim();
  await postApiWithToken<typeof body, { ok: boolean; message: string }>(
    `/api/orders/${orderId}/checkout`,
    token,
    body
  );
}

/**
 * Thanh toán đơn hàng
 */
export async function apiPayOrder(
  token: string,
  orderId: number,
  method: string
): Promise<void> {
  await postApiWithToken<{ method: string }, { ok: boolean; message: string }>(
    `/api/orders/${orderId}/pay`,
    token,
    { method }
  );
}

// User cancel own order (not paid)
export async function apiCancelMyOrder(
  token: string,
  orderId: number
): Promise<void> {
  await postApiWithToken<{}, { ok: boolean; message: string }>(
    `/api/orders/${orderId}/cancel`,
    token,
    {}
  );
}

// Submit cancel request
export async function apiRequestCancelOrder(
  token: string,
  orderId: number,
  reason?: string
): Promise<CancelRequest> {
  return postApiWithToken<{ reason?: string }, CancelRequest>(
    `/api/orders/${orderId}/cancel-request`,
    token,
    { reason }
  );
}

// Get cancel request for order
export async function apiGetCancelRequest(
  token: string,
  orderId: number
): Promise<CancelRequest | null> {
  try {
    const response = await fetch(`${API_URL}/api/orders/${orderId}/cancel-request`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // 404 means no cancel request exists, return null
    if (response.status === 404) {
      return null;
    }

    // Other errors should be thrown
    if (response.status === 401 || response.status === 403) {
      throw new Error("UNAUTHORIZED");
    }

    const data = await safeJson(response);
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || data?.error || "Failed to get cancel request");
    }

    return data.data as CancelRequest | null;
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") throw err;
    // Log but don't throw for other errors - treat as no cancel request
    console.warn(`No active cancel request for order ${orderId}`);
    return null;
  }
}

/**
 * Lấy danh sách đơn hàng của user
 */
export async function apiGetMyOrders(token: string): Promise<Order[]> {
  return fetchApiWithToken<Order[]>(`/api/orders/my-orders`, token, {
    method: "GET",
  });
}

/**
 * Lấy chi tiết đơn hàng
 */
export async function apiGetOrderDetail(
  token: string,
  orderId: number
): Promise<Order> {
  return fetchApiWithToken<Order>(`/api/orders/${orderId}`, token, {
    method: "GET",
  });
}

/**
 * Track order by code (public)
 */
export async function apiTrackOrderByCode(code: string): Promise<TrackedOrder> {
  return fetchPublic<TrackedOrder>(
    `/api/orders/track/${encodeURIComponent(code)}`
  );
}

// ================= PROMOTIONS (public validation) =================
export interface PromotionValidationResult {
  promotion_id: number;
  code: string;
  discount_amount: number;
  description?: string;
}

export async function apiValidatePromotion(
  code: string,
  orderAmount: number,
  token?: string
): Promise<PromotionValidationResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/api/promotions/validate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ code, order_amount: orderAmount }),
  });
  const data = await safeJson(res);
  if (!res.ok || !data?.ok) {
    throw new Error(data?.message || data?.error || "Invalid promotion code");
  }
  return data.data as PromotionValidationResult;
}
