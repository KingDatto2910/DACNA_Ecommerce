"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Breadcrumbs from "@/components/breadcrumbs";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import ProductCard from "@/components/product-card";
import { getCategories } from "@/lib/api";
import { Category } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FavoritesPage() {
  const { isAuthenticated } = useAuth();
  const { favorites, loading, refresh } = useFavorites();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  return (
    <>
      <Navbar categories={categories} />
      <div className="container mx-auto px-4 py-12 md:px-8">
        <Breadcrumbs />
        <h1 className="text-3xl font-bold mb-6">My Favorites</h1>
        {!isAuthenticated && (
          <p className="mb-6 text-muted-foreground">
            Please{" "}
            <Link href="/login" className="underline">
              login
            </Link>{" "}
            to view favorites.
          </p>
        )}
        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center min-h-[200px] flex flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">No favorites yet.</p>
            <Button asChild variant="outline">
              <Link href="/products">Browse Products</Link>
            </Button>
            <Button onClick={() => refresh()} variant="ghost">
              Refresh
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {favorites.map((prod) => (
              <ProductCard
                key={prod.id}
                product={{
                  id: String(prod.id),
                  name: prod.name || "Product",
                  description: "",
                  price: Number(prod.price) || 0,
                  salePrice:
                    prod.sale_price !== undefined && prod.sale_price !== null
                      ? Number(prod.sale_price)
                      : undefined,
                  images: [
                    prod.thumbnail_url ||
                      "http://localhost:5000/placeholder.svg",
                  ],
                  category: "",
                  categorySlug: prod.category_slug || "",
                  subCategorySlug: prod.sub_category_slug || "",
                  sku: prod.sku,
                  model: prod.model,
                  rating: prod.average_rating,
                  reviewCount: prod.review_count,
                }}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
