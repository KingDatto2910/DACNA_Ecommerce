// dacna/app/products/[id]/page.tsx

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

import { getProductById, getProducts, getCategories } from "@/lib/api";
import { Product, Category } from "@/lib/types";
import { notFound } from "next/navigation";

import ProductDetailClient from "./product-detail-client";

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  let product: Product | null = null;
  let relatedProducts: Product[] = [];
  let categories: Category[] = [];

  try {
    const categoriesPromise = getCategories();
    const productPromise = getProductById(id);

    const [fetchedCategories, fetchedProduct] = await Promise.all([
      categoriesPromise,
      productPromise,
    ]);

    categories = fetchedCategories;
    product = fetchedProduct;

    // 3. Lấy sản phẩm liên quan
    if (product && product.categorySlug) {
      // (SỬA LỖI) "Chốt" product vào một biến const
      // để TypeScript không "lo lắng" sau lệnh await
      const currentProduct = product;

      let related = await getProducts({
        categorySlug: currentProduct.categorySlug,
      });

      // (SỬA LỖI) Dùng biến 'currentProduct' an toàn
      relatedProducts = related
        .filter((p) => p.id !== currentProduct.id)
        .slice(0, 6);
    }
  } catch (error) {
    console.error(`Failed to fetch product ${id} data:`, error);
  }

  // (GIỮ NGUYÊN) Khối kiểm tra 'null'
  if (!product) {
    notFound();
    return null;
  }

  // Giờ 'product' đã được xác nhận là 'Product' (non-null)
  return (
    <>
      <Navbar categories={categories} />

      <ProductDetailClient
        product={product}
        relatedProducts={relatedProducts}
      />

      <Footer />
    </>
  );
}
