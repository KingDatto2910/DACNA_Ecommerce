// Tệp mới: dacna/app/account/page.tsx

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { getCategories } from "@/lib/api"; // Lấy categories cho Navbar
import { Category } from "@/lib/types";
import AccountClient from "./account-client"; // Import Client Component

/**
 * Trang Tài khoản (Server Component)
 * Chịu trách nhiệm tải layout (Navbar/Footer)
 */
export default async function AccountPage() {
  let categories: Category[] = [];
  try {
    // Navbar cần categories
    categories = await getCategories();
  } catch (error) {
    console.error("Failed to fetch categories for Navbar:", error);
  }

  return (
    <>
      <Navbar categories={categories} />
      <main className="container mx-auto px-4 py-12 md:py-24 lg:py-32">
        {/*
          Phần nội dung chính là Client Component,
          nó sẽ tự xử lý logic bảo vệ (redirect)
        */}
        <AccountClient />
      </main>
      <Footer />
    </>
  );
}
