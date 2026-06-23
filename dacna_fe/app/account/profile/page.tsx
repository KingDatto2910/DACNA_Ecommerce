// dacna/app/account/profile/page.tsx

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { getCategories } from "@/lib/api";
import { Category } from "@/lib/types";
import ProfileClient from "./profile-client";

export default async function ProfilePage() {
  let categories: Category[] = [];
  try {
    categories = await getCategories();
  } catch (error) {
    console.error("Failed to fetch categories for Navbar:", error);
  }

  return (
    <>
      <Navbar categories={categories} />
      <main className="container mx-auto px-4 py-12 md:py-24 lg:py-32">
        <ProfileClient />
      </main>
      <Footer />
    </>
  );
}







