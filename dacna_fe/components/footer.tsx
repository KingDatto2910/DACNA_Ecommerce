import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

/**
 * Footer component (Mega-Footer Design)
 */
export default function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-12 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Cột 1: Thông tin cửa hàng */}
          <div className="space-y-4">
            {/* Logo */}
            <Link className="flex items-center gap-2" href="/home">
              <ShoppingBag className="h-6 w-6" />
              <span className="font-bold text-xl">Store</span>
            </Link>
            <p className="text-muted-foreground">
              7/1 Thanh Thai, Dien Hong Ward, Saigon
            </p>
            <p className="text-muted-foreground">HSU Hoa Sen University</p>
          </div>

          {/* Cột 2: Links */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Links</h3>
            <nav className="flex flex-col space-y-2">
              <Link
                href="/home"
                className="text-muted-foreground hover:text-primary"
              >
                Home
              </Link>
              <Link
                href="/products"
                className="text-muted-foreground hover:text-primary"
              >
                Products
              </Link>
              <Link
                href="/about"
                className="text-muted-foreground hover:text-primary"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-muted-foreground hover:text-primary"
              >
                Contact
              </Link>
            </nav>
          </div>

          {/* Cột 3: Help */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Help</h3>
            <nav className="flex flex-col space-y-2">
              <Link
                href="#"
                className="text-muted-foreground hover:text-primary"
              >
                Payment Options
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-primary"
              >
                Returns
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-primary"
              >
                Privacy Policies
              </Link>
            </nav>
          </div>

          {/* Cột 4: Newsletter (Lấy code từ 'news-letter.tsx') */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Newsletter</h3>
            <p className="text-muted-foreground">
              Stay updated with our latest products and exclusive offers.
            </p>
            <form className="flex space-x-2">
              <Input placeholder="Enter your email" type="email" required />
              <Button type="submit">Subscribe</Button>
            </form>
          </div>
        </div>
      </div>

      {/* Thanh Copyright (Nằm bên ngoài lưới) */}
      <div className="border-t py-6">
        <p className="text-center text-sm text-muted-foreground">
          &copy; 2025 Store. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
