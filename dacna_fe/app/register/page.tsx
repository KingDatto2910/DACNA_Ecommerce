// dacna/app/register/page.tsx
// Server component giống trang login: có Navbar + Footer để form ở đúng vị trí

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { getCategories } from "@/lib/api";
import { Category } from "@/lib/types";
import RegisterForm from "./register-form";

export default async function RegisterPage() {
  let categories: Category[] = [];
  try {
    categories = await getCategories();
  } catch (err) {
    console.error("Failed to fetch categories for register page", err);
  }

  return (
    <>
      <Navbar categories={categories} />
      <RegisterForm />
      <Footer />
    </>
  );
}
