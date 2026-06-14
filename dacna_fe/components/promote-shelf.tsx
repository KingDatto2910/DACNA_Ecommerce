/* dacna/components/promote-shelf.tsx */

"use client";

import { Product } from "@/lib/types";
import ProductCard from "./product-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

interface PromoShelfProps {
  title: string;
  products: Product[];
  keyPrefix: string;
  bannerImage: string;
  bannerLink: string;
}

export default function PromoShelf({
  title,
  products,
  keyPrefix,
  bannerImage,
  bannerLink,
}: PromoShelfProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* CỘT 1: BANNER QUẢNG CÁO */}
          <div className="md:col-span-1 h-full">
            <Link href={bannerLink}>
              <div className="relative h-full w-full aspect-square md:aspect-auto overflow-hidden rounded-lg group">
                <Image
                  src={bannerImage}
                  alt="Promotional Banner"
                  fill
                  className="object-contain transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            </Link>
          </div>

          {/* CỘT 2: CAROUSEL SẢN PHẨM */}
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold tracking-tight mb-6">{title}</h2>
            <Carousel
              opts={{
                align: "start",
                loop: products.length > 4,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2">
                {products.map((product) => (
                  <CarouselItem
                    key={`${keyPrefix}-${product.id}`}
                    className="basis-1/2 sm:basis-1/3 lg:basis-1/4 pl-2"
                  >
                    <div className="p-1 h-full">
                      <ProductCard product={product} />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex left-2" />
              <CarouselNext className="hidden md:flex right-2" />
            </Carousel>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
