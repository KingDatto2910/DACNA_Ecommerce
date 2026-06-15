"use client";

import * as React from "react";
import Image from "next/image";
import { Product } from "@/lib/types";
import { IMAGE_BASE_URL } from "@/lib/api";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  product: Product;
}

// Helper to format image URL
const formatImageUrl = (url: string): string => {
  const serverPlaceholder = `${IMAGE_BASE_URL}/placeholder.svg`;
  if (!url) return serverPlaceholder;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${IMAGE_BASE_URL}${url}`;
  return `${IMAGE_BASE_URL}/public/${url}`;
};

export function ProductGallery({ product }: ProductGalleryProps) {
  const [mainApi, setMainApi] = React.useState<CarouselApi>();
  const [thumbApi, setThumbApi] = React.useState<CarouselApi>();

  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const onSelect = React.useCallback(() => {
    if (!mainApi || !thumbApi) return;
    const newIndex = mainApi.selectedScrollSnap();
    setSelectedIndex(newIndex);
    thumbApi.scrollTo(newIndex);
  }, [mainApi, thumbApi]);

  const onThumbClick = React.useCallback(
    (index: number) => {
      if (!mainApi) return;
      mainApi.scrollTo(index);
    },
    [mainApi]
  );

  React.useEffect(() => {
    if (!mainApi) return;
    onSelect();
    mainApi.on("select", onSelect);
    mainApi.on("reInit", onSelect);

    return () => {
      mainApi.off("select", onSelect);
      mainApi.off("reInit", onSelect);
    };
  }, [mainApi, onSelect]);

  return (
    // Bố cục 2 cột: 1 cột cho thumbnail (trái), 1 cột cho ảnh chính (phải)
    <div className="grid grid-cols-[auto_1fr] gap-4">
      {/* Cột 1: Thumbnail (Trượt dọc) */}
      {/* THAY ĐỔI 1: Bỏ chiều cao cố định, thêm max-h-full và overflow-y-auto */}
      <div className="relative w-24 max-h-[500px] overflow-y-auto">
        <Carousel
          setApi={setThumbApi}
          orientation="vertical"
          opts={{
            align: "start",
            containScroll: "keepSnaps",
            dragFree: true,
          }}
          className="h-full" // THAY ĐỔI 2: Đảm bảo Carousel chiếm hết chiều cao khả dụng
        >
          {/* THAY ĐỔI 3: CarouselContent tự giãn theo chiều dọc */}
          <CarouselContent className="h-full flex-grow">
            {product.images.map((imgSrc, index) => (
              <CarouselItem
                key={index}
                className="basis-1/4 pt-1 cursor-pointer" // Hiển thị 4 thumbnail
                onClick={() => onThumbClick(index)}
              >
                <div
                  className={cn(
                    "aspect-square relative transition-opacity",
                    selectedIndex === index
                      ? "opacity-100"
                      : "opacity-50 hover:opacity-100"
                  )}
                >
                  <Image
                    src={formatImageUrl(imgSrc)}
                    alt={`${product.name} thumbnail ${index + 1}`}
                    fill
                    className="object-contain bg-white border rounded-md"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {/* Nút Previous/Next nếu cần, nhưng thường không dùng cho thumbnail vertical */}
        </Carousel>
      </div>

      {/* Cột 2: Ảnh chính (Trượt ngang) */}
      <div className="overflow-hidden">
        <Carousel setApi={setMainApi} className="w-full">
          <CarouselContent>
            {product.images.map((imgSrc, index) => (
              <CarouselItem key={index}>
                <div className="relative bg-white border rounded-lg min-h-[500px]">
                  <Image
                    src={formatImageUrl(imgSrc)}
                    alt={`${product.name} image ${index + 1}`}
                    fill
                    className="object-contain p-4"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
      </div>
    </div>
  );
}
