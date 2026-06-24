"use client";

import { Product, CartItem } from "@/lib/types";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { toast } from "sonner";

// 1. Import các công cụ mới
import { useAuth } from "./use-auth";
import {
  apiGetMyCart,
  apiUpsertCartItem,
  apiRemoveCartItem,
  apiClearCart,
  DbCartItem, // Import kiểu dữ liệu từ cart-api
} from "@/lib/cart-api";

interface CartContextType {
  items: CartItem[]; //Products item in cart
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateItemQuantity: (productId: string, newQuantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  totalItems: number;
  isLoading: boolean; // Cờ báo đang tải giỏ hàng
}

const CartContext = createContext<CartContextType | undefined>(undefined); //Intial context
const initialCartState: CartItem[] = []; //Empty cart initial state

/**
 * 2. Transition Function
 * Biến dữ liệu thô từ CSDL (DbCartItem) thành dữ liệu FE (CartItem)
 */
function convertDbItemToFeItem(dbItem: DbCartItem): CartItem {
  //  "Tạo giả" một đối tượng Product từ thông tin DB
  const product: Product = {
    id: dbItem.product_id.toString(),
    name: dbItem.name,
    // Dùng unit_price (giá tại thời điểm mua) làm giá gốc
    price: parseFloat(String(dbItem.unit_price)),
    images: [dbItem.image_url || "http://localhost:5000/placeholder.svg"], // Lấy ảnh

    // Các trường này không quá quan trọng trong giỏ hàng
    // nhưng cần thiết để khớp kiểu 'Product'
    description: "",
    category: "",
    categorySlug: "",
    sku: dbItem.sku,
    model: dbItem.model || undefined,
  };

  return {
    product: product,
    quantity: dbItem.qty,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  // 3. LẤY NGỮ CẢNH AUTH
  const { isAuthenticated, token } = useAuth();

  const [items, setItems] = useState<CartItem[]>(initialCartState);
  const [dbCartId, setDbCartId] = useState<number | null>(null); // State chứa Order ID
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingCartRef = useRef(false); // Prevent concurrent loads with ref

  /**
   * 4. HÀM TẢI GIỏ HÀNG (Logic Chuyển đổi Ngữ cảnh)
   */
  const loadCart = useCallback(async () => {
    // Prevent concurrent cart loads
    if (isLoadingCartRef.current) {
      console.log("Cart load already in progress, skipping...");
      return;
    }

    isLoadingCartRef.current = true;
    setIsLoading(true);

    try {
      if (isAuthenticated && token) {
        // ========== LUỒNG USER (Đã đăng nhập) ==========
        const dbCart = await apiGetMyCart(token);
        setDbCartId(dbCart.id); // Lưu lại ID giỏ hàng CSDL

        // Dùng hàm chuyển đổi để đưa về dạng CartItem
        const feItems = dbCart.items.map(convertDbItemToFeItem);
        setItems(feItems);
      } else {
        // ========== LUỒNG KHÁCH (Guest) ==========
        const cart = localStorage.getItem("cart");
        setItems(cart ? JSON.parse(cart) : []);
        setDbCartId(null); // Không có ID giỏ hàng CSDL
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // If token expired or unauthorized, the global event handler will log out
      // Just clear the cart and let the auth hook handle the rest
      if (errorMessage === "UNAUTHORIZED" || errorMessage === "TOKEN_EXPIRED") {
        console.warn("Auth error detected, clearing cart...");
        setItems([]);
        setDbCartId(null);
      } else {
        // Other errors (like cart not found) - reset and clear
        console.warn("Cart load error, resetting:", errorMessage);
        setItems([]);
        setDbCartId(null);
      }
    } finally {
      setIsLoading(false);
      isLoadingCartRef.current = false;
    }
  }, [isAuthenticated, token]); // <--- Chạy lại khi Đăng nhập/Đăng xuất

  // 5. TỰ ĐỘNG TẢI LẠI KHI AUTH THAY ĐỔI
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // 6. LƯU LOCALSTORAGE (Chỉ khi là khách)
  useEffect(() => {
    // Chỉ lưu vào localStorage nếu là Khách
    if (!isAuthenticated) {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  }, [items, isAuthenticated]);

  /**
   * 7. HÀM ADD TO CART (Phân luồng)
   */
  const addToCart = async (product: Product) => {
    const existingItem = items.find((i) => i.product.id === product.id);
    const newQty = (existingItem?.quantity || 0) + 1;

    if (isAuthenticated && token && dbCartId) {
      // === LUỒNG DB (USER) ===
      try {
        // Gọi API
        await apiUpsertCartItem(token, dbCartId, product.id, newQty);

        // Cập nhật state FE
        setItems((prev) =>
          existingItem
            ? prev.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: newQty }
                  : item
              )
            : [...prev, { product, quantity: 1 }]
        );
        toast.success(`${product.name} added to cart!`);
      } catch (error: unknown) {
        // If cart not found, reload to recreate it
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes("404") ||
          errorMessage.includes("not found")
        ) {
          await loadCart();
          // Retry the operation
          try {
            const freshCart = await apiGetMyCart(token);
            await apiUpsertCartItem(token, freshCart.id, product.id, newQty);
            await loadCart();
            toast.success(`${product.name} added to cart!`);
          } catch (retryError: unknown) {
            const retryErrorMessage =
              retryError instanceof Error
                ? retryError.message
                : String(retryError);
            toast.error(`Failed to add item: ${retryErrorMessage}`);
          }
        } else {
          toast.error(`Failed to add item: ${errorMessage}`);
        }
      }
    } else {
      // === LUỒNG LOCALSTORAGE (KHÁCH) ===
      setItems((prev) =>
        existingItem
          ? prev.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: newQty }
                : item
            )
          : [...prev, { product, quantity: 1 }]
      );
      toast.success(`${product.name} added to cart!`);
    }
  };

  /**
   * 8. HÀM UPDATE QUANTITY (Phân luồng)
   */
  const updateItemQuantity = async (productId: string, newQuantity: number) => {
    if (isAuthenticated && token && dbCartId) {
      // === LUỒNG DB (USER) ===
      try {
        if (newQuantity <= 0) {
          // Nếu số lượng <= 0 thì gọi API xoá item thay vì upsert 0 (backend không cho 0)
          await apiRemoveCartItem(token, dbCartId, productId);
          setItems((prev) => prev.filter((i) => i.product.id !== productId));
        } else {
          await apiUpsertCartItem(token, dbCartId, productId, newQuantity);
          // Cập nhật state FE
          setItems((prev) =>
            prev.map((item) =>
              item.product.id === productId
                ? { ...item, quantity: newQuantity }
                : item
            )
          );
        }
      } catch (error: unknown) {
        // If cart not found, reload to recreate it
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes("404") ||
          errorMessage.includes("not found")
        ) {
          await loadCart();
          toast.info("Cart refreshed, please try again");
        } else {
          toast.error(`Failed to update quantity: ${errorMessage}`);
        }
      }
    } else {
      // === LUỒNG LOCALSTORAGE (KHÁCH) ===
      setItems((prev) =>
        prev
          .map((item) =>
            item.product.id === productId
              ? { ...item, quantity: newQuantity }
              : item
          )
          .filter((item) => item.quantity > 0)
      );
    }
  };

  /**
   * 9. HÀM REMOVE FROM CART (Phân luồng)
   */
  const removeFromCart = async (productId: string) => {
    if (isAuthenticated && token && dbCartId) {
      // === LUỒNG DB (USER) ===
      try {
        await apiRemoveCartItem(token, dbCartId, productId);
        // Cập nhật state FE
        setItems((prev) =>
          prev.filter((item) => item.product.id !== productId)
        );
      } catch (error: unknown) {
        // If cart not found, reload to recreate it
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes("404") ||
          errorMessage.includes("not found")
        ) {
          await loadCart();
          toast.info("Cart refreshed");
        } else {
          toast.error(`Failed to remove item: ${errorMessage}`);
        }
      }
    } else {
      // === LUỒNG LOCALSTORAGE (KHÁCH) ===
      setItems((prev) => prev.filter((item) => item.product.id !== productId));
    }
  };

  // (Hàm này cần nâng cấp tương tự)
  const clearCart = async () => {
    // Always clear FE state optimistically
    setItems([]);

    if (isAuthenticated && token) {
      try {
        const refreshed = await apiClearCart(token);
        // Optionally sync with server cart totals/items
        setDbCartId(refreshed.id);
        toast.success("Cart cleared");
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Still consider cart cleared locally
        toast.info(`Cart cleared locally${errorMessage ? ": " + errorMessage : ""}`);
      }
    }
  };

  // Tính toán (Giữ nguyên)
  const { totalItems, subtotal } = useMemo(() => {
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = items.reduce((total, item) => {
      const price = item.product.salePrice ?? item.product.price;
      return total + price * item.quantity;
    }, 0);

    return { totalItems, subtotal };
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateItemQuantity,
        clearCart,
        subtotal,
        totalItems,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
