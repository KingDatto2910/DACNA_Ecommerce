// dacna/app/search/search-list.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Product } from "@/lib/types";
import { getProducts } from "@/lib/api";
import ProductCard from "@/components/product-card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * (THAY ĐỔI) Component này nhận 'initialProducts' từ Server
 */
interface SearchListProps {
  initialProducts: Product[];
  initialQuery: string;
}

export default function SearchList({
  initialProducts,
  initialQuery,
}: SearchListProps) {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<
    "relevance" | "name-asc" | "name-desc" | "price-asc" | "price-desc"
  >("relevance");
  const [visibleCount, setVisibleCount] = useState<number>(12);

  // Lấy query 'q' từ URL
  const query = searchParams.get("q") || "";

  // (THAY ĐỔI) useEffect này sẽ chạy khi 'query' trên URL thay đổi
  // (Ví dụ: người dùng tìm kiếm lại từ Navbar)
  useEffect(() => {
    // Nếu query hiện tại khác với query lúc server render,
    // chúng ta mới cần fetch lại dữ liệu phía client.
    if (query !== initialQuery) {
      const fetchSearchResults = async () => {
        if (!query) {
          setProducts([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const results = await getProducts({ q: query });
          // Áp dụng sort hiện tại cho kết quả
          const sorted = sortProducts(results, sortKey);
          setProducts(sorted);
        } catch (error) {
          console.error("Failed to fetch search results:", error);
          setProducts([]);
        } finally {
          setLoading(false);
        }
      };

      fetchSearchResults();
    } else {
      // Nếu query giống, chỉ cần dùng data từ server
      setProducts(sortProducts(initialProducts, sortKey));
    }
    // Reset phân trang khi thay đổi kết quả
    setVisibleCount(12);
  }, [query, initialQuery, initialProducts, sortKey]);

  function sortProducts(list: Product[], key: typeof sortKey) {
    const copy = [...list];
    copy.sort((a, b) => {
      const priceA = a.salePrice ?? a.price;
      const priceB = b.salePrice ?? b.price;
      switch (key) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return priceA - priceB;
        case "price-desc":
          return priceB - priceA;
        default:
          return 0;
      }
    });
    return copy;
  }

  // (THAY ĐỔI) Hiển thị tiêu đề động
  const getTitle = () => {
    if (loading) {
      return `Searching for "${query}"...`;
    }
    if (!query) {
      return "Please enter a search term";
    }
    return `Results for "${query}" (${products.length})`;
  };

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{getTitle()}</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort by
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortKey("relevance")}>
                Default
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortKey("name-asc")}>
                Name A-Z
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortKey("name-desc")}>
                Name Z-A
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortKey("price-asc")}>
                Price: Low to High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortKey("price-desc")}>
                Price: High to Low
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center text-muted-foreground">
          <p>No products found matching your search.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.slice(0, visibleCount).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {visibleCount < products.length && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((v) => v + 12)}
              >
                Load more products
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
