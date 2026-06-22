// dacna/app/verify/page.tsx
// Server component with same layout as login/register pages

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { getCategories } from "@/lib/api";
import { Category } from "@/lib/types";
import VerifyForm from "./verify-form";

interface VerifyPageProps {
  searchParams: {
    email?: string;
  };
}

/**
 * Trang Xác minh OTP (Server Component)
 */
export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const email = params.email || "";

  let categories: Category[] = [];
  try {
    categories = await getCategories();
  } catch (err) {
    console.error("Failed to fetch categories for verify page", err);
  }

  if (!email) {
    // Trường hợp không có email
    return (
      <>
        <Navbar categories={categories} />
        <div className="flex items-center justify-center py-12 md:py-24 lg:py-32">
          <div className="text-center">
            <p className="text-destructive text-lg">
              Error: Email address not found in URL.
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar categories={categories} />
      <VerifyForm email={email} />
      <Footer />
    </>
  );
}
