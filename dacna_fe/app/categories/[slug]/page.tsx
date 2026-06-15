import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Breadcrumbs from "@/components/breadcrumbs";
import CategoryClient from "./category-client";
import { getProducts, getCategories, getCategoryBySlug } from "@/lib/api";
import { Product, Category } from "@/lib/types";
import { notFound } from "next/navigation";

// Next.js 15: params & searchParams are async Promises in dynamic routes
interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sub?: string }>;
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const { sub } = await searchParams;

  let products: Product[] = [];
  let allCategories: Category[] = [];
  let currentCategory: Category | null = null;

  try {
    // Fetch all data in parallel for better performance
    const [fetchedCategories, fetchedCategory, fetchedProducts] =
      await Promise.all([
        getCategories(),
        getCategoryBySlug(slug),
        getProducts({ categorySlug: slug, subCategorySlug: sub }),
      ]);

    allCategories = fetchedCategories;
    currentCategory = fetchedCategory;
    products = fetchedProducts;
  } catch (error) {
    console.error(`Failed to fetch category ${slug} data:`, error);
  }

  if (!currentCategory) {
    notFound();
  }

  // Display subcategory name if filtering by sub
  const displayName =
    sub && products.length > 0 && products[0].subCategory
      ? `${currentCategory.name} - ${products[0].subCategory}`
      : currentCategory.name;

  return (
    <>
      <Navbar categories={allCategories} />
      <main className="container mx-auto px-4 md:px-8 my-8">
        <Breadcrumbs />
        <h1 className="text-3xl font-bold mb-8">{displayName}</h1>

        <CategoryClient
          initialProducts={products}
          categorySlug={slug}
          subCategorySlug={sub}
        />
      </main>
      <Footer />
    </>
  );
}
