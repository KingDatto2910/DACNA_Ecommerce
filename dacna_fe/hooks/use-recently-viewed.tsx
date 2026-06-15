"use client";

import { Product } from "@/lib/types";
import { useState, useEffect } from "react";

const STORAGE_KEY = "recentlyViewed";
const MAX_RECENTLY_VIEWED = 10;

/**
 * Hook này quản lý danh sách sản phẩm đã xem gần đây.
 */
export function useRecentlyViewed(productToAdd: Product | null) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const storedItemsRaw = localStorage.getItem(STORAGE_KEY);
    let items: Product[] = storedItemsRaw ? JSON.parse(storedItemsRaw) : [];

    if (productToAdd) {
      if (!items[0] || items[0].id !== productToAdd.id) {
        // Xóa sản phẩm nếu nó đã tồn tại ở vị trí cũ
        items = items.filter((p) => p.id !== productToAdd.id);

        // Thêm sản phẩm mới vào ĐẦU danh sách
        items.unshift(productToAdd);

        // Giới hạn danh sách
        items = items.slice(0, MAX_RECENTLY_VIEWED);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    }

    setProducts(items);
  }, [productToAdd]); // Hook này sẽ chạy lại mỗi khi 'productToAdd' thay đổi

  return { recentlyViewedProducts: products };
}
