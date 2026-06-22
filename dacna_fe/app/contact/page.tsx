import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { getCategories } from "@/lib/api";
import { Category } from "@/lib/types";
import ContactClient from "./contact-client";

export default async function ContactPage() {
  let categories: Category[] = [];
  try {
    categories = await getCategories();
  } catch (error) {
    console.error("Failed to fetch categories for Navbar:", error);
  }

  return (
    <>
      <Navbar categories={categories} />
      <main className="min-h-screen">
        <ContactClient />
      </main>
      <Footer />
    </>
  );
}

