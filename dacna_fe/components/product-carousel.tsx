"use client";

import { Product } from "@/lib/types";
import ProductCard from "./product-card";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ProductCarouselProps {
  title: string;
  products: Product[];
  keyPrefix: string;
  bannerImage?: string;
  bannerAlt?: string;
}

export default function ProductCarousel({
  title,
  products,
  keyPrefix,
  bannerImage,
  bannerAlt,
}: ProductCarouselProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        {/* Banner Section */}
        {bannerImage ? (
          <div className="relative w-full h-32 md:h-48 rounded-lg overflow-hidden mb-4">
            <Image
              src={bannerImage}
              alt={bannerAlt || title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center px-6 md:px-12">
              <h2 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg">
                {title}
              </h2>
            </div>
          </div>
        ) : (
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        )}
      </CardHeader>
      <CardContent>
        <Carousel
          opts={{
            align: "start",
            loop: products.length > 5,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {products.map((product) => (
              <CarouselItem
                key={`${keyPrefix}-${product.id}`}
                className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 pl-2"
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
      </CardContent>
    </Card>
  );
}
