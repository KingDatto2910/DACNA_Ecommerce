"use client";
import { useEffect, useState } from "react";
import Categories from "@/components/categories";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import Breadcrumbs from "@/components/breadcrumbs";
import { getCategories } from "@/lib/api";
import { Category } from "@/lib/types";

function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Failed to load categories:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex-1">
          <Breadcrumbs />
          <p className="text-center text-muted-foreground">
            Loading categories...
          </p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-12 flex-1">
        <Breadcrumbs />
        <Categories categories={categories} />
      </div>
      <Footer />
    </>
  );
}

export default CategoriesPage;
