"use client";

import { ShoppingBag, X, Plus, Minus } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "./ui/sheet";
import Link from "next/link";
import { ScrollArea } from "./ui/scroll-area";
import Image from "next/image";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

/**
 * Component CartSheet (Cửa sổ giỏ hàng)
 */
export default function CartSheet() {
  const {
    items,
    removeFromCart,
    updateItemQuantity,
    clearCart,
    totalItems,
    subtotal,
  } = useCart();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingBag className="h-5 w-5" />
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
              {totalItems}
            </span>
          )}
          <span className="sr-only">Open cart</span>
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Shopping Cart ({totalItems})</SheetTitle>
        </SheetHeader>

        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 px-4">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-medium">Your cart is empty</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add some products to your cart to see them here.
              </p>
            </div>
            <Button asChild>
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>
        ) : (
          // Phần giỏ hàng có sản phẩm
          <>
            <ScrollArea className="flex-1 min-h-0 px-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center space-x-4"
                  >
                    {/* Ảnh */}
                    <Link
                      href={`/products/${item.product.id}`}
                      className="relative h-16 w-16 overflow-hidden rounded block"
                    >
                      <div className="relative h-16 w-16">
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </Link>
                    {/* Tên và Giá */}
                    <div className="flex-1 space-y-1">
                      <h4 className="font-medium">
                        <Link
                          href={`/products/${item.product.id}`}
                          className="hover:underline"
                        >
                          {item.product.name}
                        </Link>
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        $
                        {(item.product.salePrice ?? item.product.price).toFixed(
                          2
                        )}
                      </p>
                    </div>
                    {/* Nút +/- (Số lượng) */}
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          updateItemQuantity(item.product.id, item.quantity - 1)
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          updateItemQuantity(item.product.id, item.quantity + 1)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Nút Xóa */}
                    <Button
                      onClick={() => removeFromCart(item.product.id)}
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <SheetFooter>
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Shipping and taxes calculated at checkout.
                </p>
                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link href="/checkout">Checkout</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={clearCart}
                  >
                    Clear Cart
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
