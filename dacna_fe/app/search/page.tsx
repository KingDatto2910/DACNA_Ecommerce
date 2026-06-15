// dacna/app/search/page.tsx

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Breadcrumbs from "@/components/breadcrumbs";

// (THAY ĐỔI) Import API thật và Types
import { getProducts, getCategories } from "@/lib/api";
import { Product, Category } from "@/lib/types";

// (THAY ĐỔI) Import Client Component mới
import SearchList from "./search-list";

// Next.js 15: searchParams is async Promise
interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || "";

  // (THAY ĐỔI) Gọi API ở Server
  let initialProducts: Product[] = [];
  let categories: Category[] = [];

  try {
    // 1. Luôn lấy categories cho Navbar
    const categoriesPromise = getCategories();

    // 2. Chỉ tìm sản phẩm nếu có 'query'
    const productsPromise = query
      ? getProducts({ q: query })
      : Promise.resolve([]);

    const [fetchedCategories, fetchedProducts] = await Promise.all([
      categoriesPromise,
      productsPromise,
    ]);

    categories = fetchedCategories;
    initialProducts = fetchedProducts;
  } catch (error) {
    console.error("Failed to fetch search page data:", error);
  }

  return (
    <>
      {/* (SỬA LỖI) Navbar nhận 'categories' từ Server */}
      <Navbar categories={categories} />

      <main className="container mx-auto px-4 md:px-8 my-8">
        <Breadcrumbs />

        {/* (THAY ĐỔI) Render Client Component và truyền data vào */}
        <SearchList initialProducts={initialProducts} initialQuery={query} />
      </main>
      <Footer />
    </>
  );
}
