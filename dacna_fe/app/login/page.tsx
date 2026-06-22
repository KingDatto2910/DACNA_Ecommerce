// dacna/app/login/page.tsx

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { getCategories } from "@/lib/api";
import { Category } from "@/lib/types";
import LoginForm from "../login-form";

export default async function LoginPage() {
  let categories: Category[] = [];

  try {
    categories = await getCategories();
  } catch (error) {
    console.error("Failed to fetch categories for login page:", error);
  }

  return (
    <>
      <Navbar categories={categories} />
      <LoginForm />
      <Footer />
    </>
  );
}
