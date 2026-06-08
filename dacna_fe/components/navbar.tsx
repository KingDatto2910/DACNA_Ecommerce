"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Menu,
  Search,
  ShoppingBag,
  User,
  LogIn,
  LogOut,
  ChevronRightIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import React, { useState } from "react";
import CartSheet from "./cart-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Category } from "@/lib/types";

interface NavbarProps {
  categories?: Category[];
}

/**
 * Navbar Component
 * Main navigation bar with category menu, search, authentication, and cart
 */
export default function Navbar({ categories = [] }: NavbarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const allCategories = categories || [];
  const { isAuthenticated, user, logout } = useAuth();

  /**
   * Handle search form submission
   * Redirects to search page with query parameter
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const routes = [
    { href: "/home", label: "Home" },
    { href: "/products", label: "Products" },
    { href: "/track", label: "Track Order" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 w-full z-50 bg-white border-b">
      <div className="container mx-auto md:py-6 md:px-8 flex h-16 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuLabel>Shop by Department</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {allCategories.map((category) => {
              const hasSubCategories =
                category.subCategories && category.subCategories.length > 0;

              if (hasSubCategories) {
                return (
                  <DropdownMenuSub key={category.id}>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <span>{category.name}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link href={`/categories/${category.slug}`}>
                            <span className="font-semibold">
                              All {category.name}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {category.subCategories!.map((sub) => (
                          <DropdownMenuItem
                            asChild
                            key={sub.id}
                            className="cursor-pointer"
                          >
                            <Link
                              href={`/categories/${category.slug}?sub=${sub.slug}`}
                            >
                              {sub.name}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                );
              }

              return (
                <DropdownMenuItem
                  asChild
                  key={category.id}
                  className="cursor-pointer"
                >
                  <Link href={`/categories/${category.slug}`}>
                    <div className="flex items-center justify-between w-full">
                      <span>{category.name}</span>
                      <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Link className="flex items-center gap-2 md:mr-8" href="/home">
          <ShoppingBag className="h-6 w-6" />
          <span className="font-bold text-xl">Store</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="font-medium transition-colors hover:text-primary"
            >
              {route.label}
            </Link>
          ))}
        </nav>

        {/* Search, User & Cart */}
        <div className="flex items-center gap-4 ml-auto px-4 md:px-0">
          <form onSubmit={handleSearch} className="hidden md:flex items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="w-full md:w-[200px] lg:w-[300px] pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>

          {/* Mobile Search */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => router.push("/search")}
          >
            <Search className="w-5 h-5" />
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full bg-primary/10">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || "User"}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <span className="sr-only">My Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  Hi, {user?.name || "User"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/account">
                    <User className="mr-2 h-4 w-4" />
                    <span>My Account</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost" size="icon">
              <Link href="/login-selection">
                <LogIn className="h-5 w-5" />
                <span className="sr-only">Login</span>
              </Link>
            </Button>
          )}
          <CartSheet />
        </div>
      </div>
    </header>
  );
}
