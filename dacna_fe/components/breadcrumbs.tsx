"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { getProductById, getCategories } from "@/lib/api";
import { Product, Category } from "@/lib/types";

const capitalize = (s: string) => {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Component Breadcrumbs - Now using real API data
 */
export default function Breadcrumbs() {
  const pathname = usePathname();
  const [crumbs, setCrumbs] = useState([{ href: "/home", label: "Home" }]);

  useEffect(() => {
    if (pathname === "/home" || pathname === "/") {
      setCrumbs([{ href: "/home", label: "Home" }]);
      return;
    }

    const segments = pathname.split("/").filter(Boolean);
    const baseCrumbs = [{ href: "/home", label: "Home" }];

    // Build crumbs with API data
    const buildCrumbs = async () => {
      let currentPath = "";
      const newCrumbs = [...baseCrumbs];

      for (let index = 0; index < segments.length; index++) {
        const segment = segments[index];
        if (segment === "home") continue;

        currentPath += `/${segment}`;
        let label = capitalize(segment);

        try {
          // If this is a product ID (previous segment is "products")
          if (index > 0 && segments[index - 1] === "products") {
            try {
              const product: Product = await getProductById(segment);
              if (product) {
                label = product.name;
              }
            } catch {
              label = "Product";
            }
          }
          // If this is a category slug (previous segment is "categories")
          else if (index > 0 && segments[index - 1] === "categories") {
            try {
              const categories: Category[] = await getCategories();
              const category = categories.find((c) => c.slug === segment);
              if (category) {
                label = category.name;
              }
            } catch {
              label = "Category";
            }
          }
        } catch (e) {
          console.error("Error building breadcrumb:", e);
        }

        newCrumbs.push({ href: currentPath, label });
      }

      setCrumbs(newCrumbs);
    };

    buildCrumbs();
  }, [pathname]);

  if (pathname === "/home" || pathname === "/") {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
      <ol className="flex items-center space-x-2">
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            <li>
              {index === crumbs.length - 1 ? (
                <span className="font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:text-primary">
                  {crumb.label}
                </Link>
              )}
            </li>
            {index < crumbs.length - 1 && (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
