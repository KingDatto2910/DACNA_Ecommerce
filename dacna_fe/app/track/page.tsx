// dacna/app/track/page.tsx

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { getCategories } from "@/lib/api";
import { Category } from "@/lib/types";
import TrackOrderClient from "./track-client";

export const metadata = {
  title: "Track Order",
};

export default async function TrackOrderPage() {
  let categories: Category[] = [];
  try {
    categories = await getCategories();
  } catch (err) {
    console.error("Failed to load categories for navbar:", err);
  }

  return (
    <>
      <Navbar categories={categories} />
      <main className="container mx-auto px-4 md:px-8 my-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-semibold mb-4">Track your order</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter your order code to see the latest status and details.
          </p>
          <TrackOrderClient />
        </div>
      </main>
      <Footer />
    </>
  );
}
