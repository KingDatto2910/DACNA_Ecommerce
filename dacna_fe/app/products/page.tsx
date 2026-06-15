// dacna/app/products/page.tsx

// (THAY ĐỔI) Đây là Server Component (Không có "use client")
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Breadcrumbs from "@/components/breadcrumbs";

// (THAY ĐỔI) Import hàm API và Types
import { getProducts, getCategories } from "@/lib/api";
import { Product, Category } from "@/lib/types";

// (THAY ĐỔI) Import Client Component mới
import ProductList from "./product-list";

export default async function ProductsPage() {
  // (THAY ĐỔI) Gọi API ở Server
  let initialProducts: Product[] = [];
  let categories: Category[] = [];

  try {
    // Gọi API song song
    const [fetchedCategories, fetchedProducts] = await Promise.all([
      getCategories(),
      getProducts({}), // Lấy tất cả sản phẩm
    ]);
    categories = fetchedCategories;
    initialProducts = fetchedProducts;
  } catch (error) {
    console.error("Failed to fetch products page data:", error);
    // Nếu lỗi, trang vẫn render nhưng 'ProductList' sẽ nhận mảng rỗng
  }

  return (
    <>
      {/*Navbar giờ nhận 'categories' từ Server */}
      <Navbar categories={categories} />

      <main className="container mx-auto px-4 md:px-8 my-8">
        <Breadcrumbs />

        {/*Render Client Component và truyền data vào */}
        <ProductList
          initialProducts={initialProducts}
          categories={categories}
        />
      </main>
      <Footer />
    </>
  );
}
