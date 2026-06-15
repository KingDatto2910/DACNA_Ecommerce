"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "./ui/card";
import Link from "next/link";
import { Button } from "./ui/button";
import { useCart } from "@/hooks/use-cart";
import { Product } from "@/lib/types";
import { IMAGE_BASE_URL } from "@/lib/api";
import { ShoppingCart, Star, Loader2, Heart } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";

interface ProductCardProps {
  product: Product;
}

// Helper to format image URL
const formatImageUrl = (url: string): string => {
  const serverPlaceholder = `${IMAGE_BASE_URL}/placeholder.svg`;
  if (!url) return serverPlaceholder;
  if (url.startsWith("http")) return url; // External URL
  if (url.startsWith("/")) return `${IMAGE_BASE_URL}${url}`; // Server path like /public/product/...
  return `${IMAGE_BASE_URL}/public/${url}`; // Relative path like product/image.jpg
};

/**
 * ProductCard component (Compact Design)
 */
function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const { toggleFavorite, isFavorited } = useFavorites();

  // Debug: Log product with promotions
  console.log(`🎨 ProductCard ${product.name}:`, {
    id: product.id,
    hasPromotions: !!product.applicablePromotions,
    promotionCount: product.applicablePromotions?.length || 0,
    promotions: product.applicablePromotions,
  });

  // Check if product is out of stock
  const isOutOfStock =
    product.stockQty !== undefined ? product.stockQty <= 0 : false;

  // Logic hiển thị sao (rating)
  const renderStars = () => {
    const fullStars = Math.floor(product.rating || 0);
    const halfStar = (product.rating || 0) % 1 >= 0.5;

    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <Star
            key={`full-${i}`}
            className="h-4 w-4 fill-yellow-400 text-yellow-400"
          />
        ))}
        {halfStar && (
          <Star
            className="h-4 w-4 fill-yellow-400 text-yellow-400"
            style={{ clipPath: "polygon(0 0, 50% 0, 50% 100%, 0 100%)" }}
          />
        )}
        {[...Array(5 - fullStars - (halfStar ? 1 : 0))].map((_, i) => (
          <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
        ))}
      </div>
    );
  };

  // Hàm xử lý Add to Cart (có loading)
  const handleAddToCart = () => {
    setIsLoading(true);
    addToCart(product);
    setTimeout(() => {
      setIsLoading(false);
    }, 500); // 0.5 giây delay
  };

  const fav = isFavorited(Number(product.id));
  // Defensive numeric casting to avoid toFixed errors if backend returns strings
  const priceValue = Number(product.price) || 0;
  const salePriceValue =
    product.salePrice !== undefined && product.salePrice !== null
      ? Number(product.salePrice)
      : undefined;

  // Determine badge type based on product flags and rating
  const isTopRated = (product.rating || 0) >= 4.5;
  const badges = [];
  if (product.isTrending)
    badges.push({ type: "trending", label: "Trending", color: "bg-blue-500" });
  if (product.isBestSeller)
    badges.push({
      type: "bestseller",
      label: "Best Seller",
      color: "bg-red-500",
    });
  if (isTopRated && !product.isTrending && !product.isBestSeller)
    badges.push({
      type: "toprated",
      label: "Top Rated",
      color: "bg-amber-500",
    });

  return (
    <Card
      className={`overflow-hidden h-full flex flex-col p-0 relative group transition-all ${
        isOutOfStock ? "opacity-50 bg-gray-100" : ""
      }`}
    >
      {/* 1. PHẦN HÌNH ẢNH*/}
      <Link href={`/products/${product.id}`}>
        <div
          className={`aspect-square relative overflow-hidden bg-white ${
            isOutOfStock ? "bg-gray-200" : ""
          }`}
        >
          <Image
            src={formatImageUrl(product.images[0])}
            alt={product.name}
            fill
            className={`object-contain transition-all ${
              isOutOfStock ? "grayscale brightness-75" : "group-hover:scale-105"
            }`}
          />

          {/* Badges (Top-Left Corner) */}
          {badges.length > 0 && (
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {badges.map((badge) => (
                <div
                  key={badge.type}
                  className={`${badge.color} text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg`}
                >
                  {badge.label}
                </div>
              ))}
            </div>
          )}

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="text-center">
                <span className="text-white font-bold text-lg drop-shadow-lg">
                  Out of Stock
                </span>
              </div>
            </div>
          )}
          {/* Favorite button overlay */}
          <button
            type="button"
            aria-label="Favorite"
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(Number(product.id));
            }}
            className="absolute top-2 right-2 rounded-full bg-white/80 backdrop-blur px-2 py-2 shadow hover:bg-white transition"
          >
            <Heart
              className={`h-4 w-4 ${
                fav ? "fill-red-500 text-red-500" : "text-gray-500"
              }`}
            />
          </button>
        </div>
      </Link>

      {/* 2. KHỐI NỘI DUNG*/}
      <CardContent className="p-3">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-medium text-sm line-clamp-2 hover:text-primary hover:underline">
            {product.name}
          </h3>
        </Link>

        {product.rating && (
          <div className="flex items-center gap-1 mt-1">
            {renderStars()}
            <span className="text-xs text-gray-500">
              ({product.reviewCount || 0})
            </span>
          </div>
        )}

        {/* Stock Status Badge */}
        {product.stockQty !== undefined &&
          product.stockQty > 0 &&
          product.stockQty <= 10 && (
            <div className="mt-1 text-xs font-semibold text-orange-600">
              ⚠ Only {product.stockQty} left
            </div>
          )}

        {/* Price Section */}
        <div className="mt-2">
          {salePriceValue !== undefined ? (
            <div className="flex items-baseline gap-2">
              <p className="font-bold text-lg text-red-600">
                ${salePriceValue.toFixed(2)}
              </p>
              {/* text-red-600 is the display of salePrice */}
              <p className="font-medium text-sm text-gray-500 line-through">
                ${priceValue.toFixed(2)}
              </p>
              {/* text-gray-500 is the display of original price, line-through is the horizontal line cut through */}
            </div>
          ) : (
            <p className="font-bold text-lg">${priceValue.toFixed(2)}</p>
          )}
        </div>

        {/* Discount Promo Section - Shows when promotions are available */}
        {product.applicablePromotions &&
          product.applicablePromotions.length > 0 && (
            <>
              {/* Main Discount Label */}
              <div className="mt-3 p-2 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200">
                <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                  ✨ Enter{" "}
                  <span className="font-black">
                    "{product.applicablePromotions[0].code}"
                  </span>{" "}
                  code to get discount{" "}
                  <span className="underline">
                    {product.applicablePromotions[0].discount_type ===
                    "percentage"
                      ? `${product.applicablePromotions[0].discount_value}%`
                      : `$${product.applicablePromotions[0].discount_value.toFixed(
                          2
                        )}`}
                  </span>
                </p>
              </div>

              {/* Additional promotion codes if there are multiple */}
              {product.applicablePromotions.length > 1 && (
                <div className="mt-2 space-y-1">
                  {product.applicablePromotions.slice(1).map((promo) => (
                    <div key={promo.id} className="text-xs text-gray-600">
                      <span className="font-semibold">
                        Also use "{promo.code}"
                      </span>{" "}
                      for{" "}
                      {promo.discount_type === "percentage"
                        ? `${promo.discount_value}% off`
                        : `$${promo.discount_value.toFixed(2)} off`}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
      </CardContent>

      {/* 3. KHỐI NÚT BẤM*/}
      <div className="p-3 pt-0 mt-auto">
        {isOutOfStock ? (
          <Button
            disabled
            className="w-full bg-gray-400 text-white cursor-not-allowed"
            size="sm"
          >
            Out of Stock
          </Button>
        ) : (
          <Button
            onClick={handleAddToCart}
            className="w-full"
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="mr-2 h-4 w-4" />
            )}
            {isLoading ? "Adding..." : "Add to Cart"}
          </Button>
        )}
      </div>
    </Card>
  );
}

export default ProductCard;
