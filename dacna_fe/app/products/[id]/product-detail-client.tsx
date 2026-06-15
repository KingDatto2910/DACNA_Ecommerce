// dacna/app/products/[id]/product-detail-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/types";
import { IMAGE_BASE_URL } from "@/lib/api";
import { useCart } from "@/hooks/use-cart";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { ProductGallery } from "@/components/product-gallery";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Heart, MapPin, Loader2, AlertCircle } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import ProductCard from "@/components/product-card";
import ProductReviews from "@/components/product-reviews";
import Breadcrumbs from "@/components/breadcrumbs";

interface ProductDetailClientProps {
  product: Product;
  relatedProducts: Product[];
}

export default function ProductDetailClient({
  product,
  relatedProducts,
}: ProductDetailClientProps) {
  const router = useRouter();
  const { addToCart } = useCart();

  // Check if product is out of stock
  const isOutOfStock =
    product.stockQty !== undefined ? product.stockQty <= 0 : false;

  // State riêng cho các nút (Giữ nguyên)
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isBuyNowLoading, setIsBuyNowLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const { toggleFavorite, isFavorited } = useFavorites();

  // Hook "Recently Viewed" (Giữ nguyên)
  const { recentlyViewedProducts } = useRecentlyViewed(product);

  const handleAddToCart = () => {
    if (!product) return;
    setIsCartLoading(true);
    addToCart(product);
    setTimeout(() => {
      setIsCartLoading(false);
    }, 500);
  };
  const handleSave = () => {
    if (!product) return;
    setIsSaveLoading(true);
    toggleFavorite(Number(product.id)).finally(() => setIsSaveLoading(false));
  };
  const handleBuyNow = () => {
    if (!product) return;
    setIsBuyNowLoading(true);
    addToCart(product);
    toast.info("Redirecting to checkout...");
    setTimeout(() => {
      router.push("/checkout");
    }, 800);
  };

  const displayPrice = product.salePrice ?? product.price;
  const filteredRecentlyViewed = recentlyViewedProducts.filter(
    (p) => p.id !== product.id
  );

  // (THAY ĐỔI) JSX này không chứa Navbar/Footer
  return (
    <main className="container mx-auto px-4 py-12 flex-1">
      <Breadcrumbs />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-12">
        {/* CỘT 1: THƯ VIỆN ẢNH */}
        <div className="md:col-span-3">
          <ProductGallery product={product} />
        </div>

        {/* CỘT 2: THÔNG TIN */}
        <div className="md:col-span-2 space-y-5">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-sm text-muted-foreground">
            {product.model && (
              <div>
                <strong>Model:</strong> {product.model}
              </div>
            )}
            {product.sku && (
              <div>
                <strong>SKU:</strong> {product.sku}
              </div>
            )}
          </div>
          {/* Giá */}
          <div className="space-y-1">
            {product.salePrice ? (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-red-600">
                  ${displayPrice.toFixed(2)}
                </span>
                <span className="text-xl font-medium text-gray-500 line-through">
                  ${product.price.toFixed(2)}
                </span>
              </div>
            ) : (
              <span className="text-3xl font-bold">
                ${displayPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Khối Nút Bấm */}
          <div className="space-y-3">
            {isOutOfStock && (
              <Card className="bg-red-50 border-red-200 p-4">
                <CardContent className="p-0 flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-900">Out of Stock</p>
                    <p className="text-sm text-red-700">
                      This product is currently unavailable. Please check back
                      later.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                className="w-1/2"
                size="lg"
                disabled={isCartLoading || isOutOfStock}
              >
                {isCartLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : isOutOfStock ? (
                  "Out of Stock"
                ) : (
                  "Add to Cart"
                )}
              </Button>
              <Button
                onClick={handleSave}
                variant="outline"
                size="lg"
                className="w-1/2"
                disabled={isSaveLoading}
              >
                {isSaveLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Heart
                    className={`mr-2 h-5 w-5 ${
                      isFavorited(Number(product.id))
                        ? "fill-red-500 text-red-500"
                        : ""
                    }`}
                  />
                )}
                {isSaveLoading
                  ? "Saving..."
                  : isFavorited(Number(product.id))
                  ? "Saved"
                  : "Save"}
              </Button>
            </div>
            <Button
              onClick={handleBuyNow}
              className="w-full"
              size="lg"
              disabled={isBuyNowLoading || isOutOfStock}
            >
              {isBuyNowLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : isOutOfStock ? (
                "Out of Stock"
              ) : (
                "Buy Now"
              )}
            </Button>
          </div>

          {/* Thông tin Stock */}
          {product.stock && (
            <Card className="bg-muted/50 border-dashed p-4">
              <CardContent className="p-0">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-muted-foreground mr-3" />
                  <div>
                    <div className="font-medium">
                      {product.stock.level === "in-stock" && "In Stock"}
                      {product.stock.level === "low-stock" && "Low Stock"}
                      {product.stock.level === "out-of-stock" && "Out of Stock"}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {product.stock.storeAddress}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Khu vực Accordion */}
      <div className="mt-16 border-t pt-8">
        <Accordion
          type="single"
          collapsible
          className="w-full"
          defaultValue="item-1"
        >
          {/* Specifications */}
          {product.specifications && product.specifications.length > 0 && (
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-xl font-semibold">
                Specifications
              </AccordionTrigger>
              <AccordionContent>
                <div className="py-4">
                  <div className="flex flex-col text-sm">
                    {product.specifications.map((spec, index) => (
                      <div
                        key={spec.key}
                        className={cn(
                          "flex justify-between items-center p-3 rounded-md",
                          index % 2 === 0 ? "bg-muted/50" : ""
                        )}
                      >
                        <span className="font-medium">{spec.key}</span>
                        <span className="text-muted-foreground text-right">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Features (Mô tả) */}
          <AccordionItem value="item-2">
            <AccordionTrigger className="text-xl font-semibold">
              Features
            </AccordionTrigger>
            <AccordionContent className="pt-4 text-base">
              <p className="text-gray-700 leading-relaxed">
                {product.description}
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Reviews (Đánh giá) */}
          <AccordionItem value="item-3">
            <AccordionTrigger className="text-xl font-semibold">
              Reviews
            </AccordionTrigger>
            <AccordionContent>
              <ProductReviews product={product} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Kệ hàng "Related Items" */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 border-t pt-8">
          <h2 className="text-2xl font-bold tracking-tight mb-6">
            Related Items
          </h2>
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2">
              {relatedProducts.map((relatedProd) => (
                <CarouselItem
                  key={`related-${relatedProd.id}`}
                  className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 pl-2"
                >
                  <div className="p-1 h-full">
                    <ProductCard product={relatedProd} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      )}

      {/* Kệ hàng "Recently Viewed" */}
      {filteredRecentlyViewed.length > 0 && (
        <div className="mt-16 border-t pt-8">
          <h2 className="text-2xl font-bold tracking-tight mb-6">
            Recently Viewed
          </h2>
          <Carousel
            opts={{
              align: "start",
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2">
              {filteredRecentlyViewed.map((viewedProd) => (
                <CarouselItem
                  key={`viewed-${viewedProd.id}`}
                  className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 pl-2"
                >
                  <div className="p-1 h-full">
                    <ProductCard product={viewedProd} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      )}
    </main>
  );
}
