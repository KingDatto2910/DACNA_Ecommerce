// File mới: dacna/lib/cart-api.ts

// 1. ĐỊNH NGHĨA DbCartItem
// Đây là kiểu dữ liệu mà truy vấn SQL (ở Bước 1) trả về
// Nó là sự kết hợp của order_items, products, và product_images
export interface DbCartItem {
  product_id: number;
  qty: number;
  unit_price: number;
  amount: number;
  name: string;
  model: string | null;
  sku: string;
  image_url: string | null;
}

// 2. ĐỊNH NGHĨA DbCart
// Đây là kiểu dữ liệu trả về của API /api/orders/my-cart
// (Dựa trên hàm getOrderDetail của orderModel.js)
export interface DbCart {
  id: number; // Đây là order_id
  user_id: number;
  order_status: string;
  subtotal: number;
  shipping_fee: number;
  grand_total: number;
  items: DbCartItem[]; // Mảng các sản phẩm (đã JOIN)
}

const API_URL = "http://localhost:5000";

/**
 * 3. HÀM FETCH API CƠ SỞ (CÓ TOKEN)
 * Gửi token JWT trong header 'Authorization'
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

    // Centralized auth failure handling
    if (response.status === 401 || response.status === 403) {
      const body = await safeJson(response);
      const msg: string = body?.message || body?.error || "UNAUTHORIZED";
      // Provide normalized error messages for upstream handling
      if (/expired/i.test(msg)) {
        // Dispatch global event to trigger logout
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:logout", { detail: "TOKEN_EXPIRED" }));
        }
        throw new Error("TOKEN_EXPIRED");
      }
      // Dispatch global event for any unauthorized error
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:logout", { detail: "UNAUTHORIZED" }));
      }
      throw new Error("UNAUTHORIZED");
    }

    const data = await safeJson(response);
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || data?.error || "API request failed");
    }
    return data.data as T;
  } catch (err) {
    const e = err as unknown as { message?: string };
    console.error(`API Error (Token) at ${path}:`, e);
    throw new Error(e.message || "API Network Error");
  }
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * 4. HÀM GỌI API: LẤY GIỎ HÀNG
 * Gọi GET /api/orders/my-cart
 * (Route này được tạo trong orderController.js
 * và routes/orders.js)
 */
export async function apiGetMyCart(token: string): Promise<DbCart> {
  return fetchApiWithToken<DbCart>(`/api/orders/my-cart`, token, {
    method: "GET",
  });
}

/**
 * 5. HÀM GỌI API: THÊM/CẬP NHẬT SẢN PHẨM
 * Gọi POST /api/orders/:id/items
 * (Dùng route trong routes/orders.js)
 */
export async function apiUpsertCartItem(
  token: string,
  orderId: number,
  productId: string,
  qty: number
): Promise<void> {
  // Backend mong đợi product_id là số
  const body = {
    product_id: Number(productId),
    qty: qty,
  };

  // Chúng ta không cần data trả về, chỉ cần không lỗi
  await fetchApiWithToken(`/api/orders/${orderId}/items`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * 6. HÀM GỌI API: XÓA SẢN PHẨM
 * Gọi DELETE /api/orders/:id/items/:productId
 * (Dùng route trong routes/orders.js)
 */
export async function apiRemoveCartItem(
  token: string,
  orderId: number,
  productId: string
): Promise<void> {
  await fetchApiWithToken(`/api/orders/${orderId}/items/${productId}`, token, {
    method: "DELETE",
  });
}

/**
 * 7. HÀM GỌI API: XÓA TOÀN BỘ GIỎ HÀNG
 * Gọi POST /api/orders/clear-cart
 */
export async function apiClearCart(token: string): Promise<DbCart> {
  return fetchApiWithToken<DbCart>(`/api/orders/clear-cart`, token, {
    method: "POST",
  });
}
