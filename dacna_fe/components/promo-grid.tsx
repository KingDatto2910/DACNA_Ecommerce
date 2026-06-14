/* dacna/components/promo-grid.tsx */

"use client";

import Image from "next/image";
import Link from "next/link";
import { IMAGE_BASE_URL } from "@/lib/api";
// Import Card
import { Card, CardContent } from "@/components/ui/card";

const promoItems = [
  {
    id: 1,
    title: "Only $529.99",
    image: `${IMAGE_BASE_URL}/placeholder/400x400.svg`,
    link: "/products/1",
  },
  {
    id: 2,
    title: "Only $299.99",
    image: `${IMAGE_BASE_URL}/placeholder/400x400.svg`,
    link: "/products/10",
  },
  {
    id: 3,
    title: "Only $19.99",
    image: `${IMAGE_BASE_URL}/placeholder/400x400.svg`,
    link: "/products/9",
  },
  {
    id: 4,
    title: "Save $950",
    image: `${IMAGE_BASE_URL}/placeholder/400x400.svg`,
    link: "/products/26",
  },
];

export default function PromoGrid() {
  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="w-full bg-blue-900 text-white p-0">
        <div className="container mx-auto px-4 py-8 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {promoItems.map((item) => (
              <Link href={item.link} key={item.id} className="group block">
                <div className="bg-blue-900 rounded-lg overflow-hidden h-full flex flex-col">
                  <div className="p-4">
                    <h3 className="text-2xl font-bold">{item.title}</h3>
                  </div>
                  <div className="relative aspect-square">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
