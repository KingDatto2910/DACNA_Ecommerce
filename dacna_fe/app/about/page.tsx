import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { getCategories } from "@/lib/api";
import { Category } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export default async function AboutPage() {
  let categories: Category[] = [];
  try {
    categories = await getCategories();
  } catch (error) {
    console.error("Failed to fetch categories for Navbar:", error);
  }

  return (
    <>
      <Navbar categories={categories} />
      <main className="container mx-auto px-4 py-10 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>About DACNA Store</CardTitle>
          <CardDescription>
            A modern e-commerce demo focused on clarity and practicality.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            DACNA is a learning and showcase project built with Next.js, React,
            and a clean component-driven UI. It demonstrates common e-commerce
            features such as authentication (including Google OAuth), product
            listings, cart and checkout, and sandbox payment integration.
          </p>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">Tech Stack</h3>
              <ScrollArea className="h-24 mt-2 rounded border p-3 text-sm">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Next.js App Router</li>
                  <li>React 19 + TypeScript</li>
                  <li>shadcn/ui component library</li>
                  <li>Node.js + Express backend</li>
                  <li>MySQL database</li>
                  <li>PayPal Sandbox payments</li>
                </ul>
              </ScrollArea>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Features</h3>
              <ScrollArea className="h-24 mt-2 rounded border p-3 text-sm">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Account registration & login</li>
                  <li>Google OAuth with password setup</li>
                  <li>Product catalog, search, and filters</li>
                  <li>Cart, checkout, and order tracking</li>
                  <li>Admin panels for products and users</li>
                </ul>
              </ScrollArea>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Purpose</h3>
            <p className="text-sm text-muted-foreground">
              This project is intended for coursework and demonstration. Content
              and products may be placeholders. Payments run in sandbox mode.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button asChild variant="default">
            <Link href="/home">Browse Products</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Contact Us</Link>
          </Button>
        </CardFooter>
      </Card>
      </main>
      <Footer />
    </>
  );
}
