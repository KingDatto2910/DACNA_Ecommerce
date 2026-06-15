// dacna/app/products/product-list.tsx
"use client";

// Toàn bộ import "use client" được giữ lại ở đây
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import ProductCard from "@/components/product-card";
import FilterSidebar from "@/components/filter-sidebar";
import { Product, Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * (THAY ĐỔI) Định nghĩa props mà component này sẽ nhận từ Server
 */
interface ProductListProps {
  initialProducts: Product[];
  categories: Category[];
}

/**
 * (THAY ĐỔI) Component này giờ nhận props
 */
export default function ProductList({
  initialProducts,
  categories,
}: ProductListProps) {
  // (THAY ĐỔI) Không cần state 'loading' hay 'categories' nữa
  // const [loading, setLoading] = useState(true);
  // const [categories, setCategories] = useState<Category[]>([]);

  const router = useRouter();

  // (THAY ĐỔI) Dùng 'initialProducts' làm giá trị khởi tạo
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [filteredProducts, setFilteredProducts] =
    useState<Product[]>(initialProducts);

  // (THAY ĐỔI) Tính min/max từ props (đồng bộ)
  const [minPrice, maxPrice] = useMemo(() => {
    if (initialProducts.length === 0) {
      return [0, 1000];
    }
    const prices = initialProducts.map((p) => p.salePrice ?? p.price);
    const newMin = Math.floor(Math.min(...prices));
    const newMax = Math.ceil(Math.max(...prices));
    return [newMin, newMax];
  }, [initialProducts]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    minPrice,
    maxPrice,
  ]);
  const [selectedTags, setSelectedTags] = useState({
    trending: false,
    bestseller: false,
    toprated: false,
  });

  // Sort & Load more
  const [sortKey, setSortKey] = useState<
    "relevance" | "name-asc" | "name-desc" | "price-asc" | "price-desc"
  >("relevance");
  const [visibleCount, setVisibleCount] = useState<number>(12);

  useEffect(() => {
    let products = [...allProducts];

    // 1. Lọc theo danh mục
    if (selectedCategories.length > 0) {
      products = products.filter((product) =>
        selectedCategories.includes(product.category)
      );
    }

    // 2. Lọc theo tags (trending, bestseller, toprated)
    if (selectedTags.trending || selectedTags.bestseller || selectedTags.toprated) {
      products = products.filter((product) => {
        const matchesTrending = selectedTags.trending ? product.isTrending : true;
        const matchesBestseller = selectedTags.bestseller ? product.isBestSeller : true;
        const matchesToprated = selectedTags.toprated ? (product.rating ?? 0) >= 4.5 : true;
        return matchesTrending && matchesBestseller && matchesToprated;
      });
    }

    // 3. Lọc theo giá
    products = products.filter((product) => {
      const price = product.salePrice ?? product.price;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // 4. Sắp xếp
    products.sort((a, b) => {
      const priceA = a.salePrice ?? a.price;
      const priceB = b.salePrice ?? b.price;
      switch (sortKey) {
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

    setFilteredProducts(products);
    // Reset phân trang khi thay đổi tiêu chí
    setVisibleCount(12);
  }, [allProducts, selectedCategories, selectedTags, priceRange, sortKey]);

  // (THAY ĐỔI) Cập nhật allProducts nếu prop thay đổi (hiếm khi, nhưng an toàn)
  useEffect(() => {
    setAllProducts(initialProducts);
  }, [initialProducts]);

  // (GIỮ NGUYÊN) Các hàm xử lý filter
  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleTagChange = (tag: "trending" | "bestseller" | "toprated") => {
    setSelectedTags((prev) => ({
      ...prev,
      [tag]: !prev[tag],
    }));
  };

  const handlePriceChange = (range: [number, number]) => {
    setPriceRange(range);
  };

  const clearFilters = () => {
    // Navigate back to default products page
    router.push("/products");
  };

  // (GIỮ NGUYÊN) Giao diện (JSX)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Cột 1: Sidebar (dùng 'categories' từ prop) */}
      {categories.length > 0 && (
        <aside className="lg:col-span-1">
          <FilterSidebar
            categories={categories}
            selectedCategories={selectedCategories}
            selectedTags={selectedTags}
            priceRange={priceRange}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onCategoryChange={handleCategoryChange}
            onTagChange={handleTagChange}
            onPriceChange={handlePriceChange}
            onClearFilters={clearFilters}
          />
        </aside>
      )}

      {/* Cột 2: Lưới sản phẩm */}
      <section className="md:col-span-3">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">All Products</h1>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Sorted By
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortKey("relevance")}>
                  Default
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortKey("name-asc")}>
                  Tên A-Z
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortKey("name-desc")}>
                  Tên Z-A
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortKey("price-asc")}>
                  Giá tăng dần
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortKey("price-desc")}>
                  Giá giảm dần
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* (THAY ĐỔI) Xóa 'loading', vì Server đã tải */}
        {filteredProducts.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <p>No products found matching your criteria.</p>
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Clear all filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.slice(0, visibleCount).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {visibleCount < filteredProducts.length && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((v) => v + 12)}
                >
                  Xem thêm sản phẩm
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
