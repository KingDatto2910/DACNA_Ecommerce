"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { useEffect, useState, useRef } from "react";
import { getCategories } from "@/lib/api";
import { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Package, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

interface OrderDetails {
  id: number;
  order_code: string;
  address_street: string;
  address_district?: string;
  address_ward?: string;
  address_city: string;
  subtotal: number;
  shipping_fee: number;
  discount_amount?: number;
  grand_total: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  items: Array<{
    id: number;
    product_id: number;
    item_name_snapshot: string;
    unit_price: number;
    qty: number;
    amount: number;
  }>;
}

export default function OrderSuccessPage() {
  const params = useSearchParams();
  const code = params.get("code") || "";
  const { clearCart } = useCart();
  const hasCleared = useRef(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Clear cart only once when order is successfully placed
    if (!hasCleared.current) {
      hasCleared.current = true;
      clearCart();
    }

    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    // Fetch order details by code
    if (code) {
      fetch(`http://localhost:5000/api/orders/track/${code}`)
        .then((res) => res.json())
        .then((result) => {
          if (result.ok) {
            setOrderDetails(result.data);
          }
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch order details:", err);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [code]);

  if (!code) {
    return (
      <>
        <Navbar categories={categories} />
        <main className="container mx-auto px-4 py-12 min-h-[60vh] flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Invalid order information</p>
              <Button asChild className="mt-4">
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar categories={categories} />
      <div className="container mx-auto px-4 py-12 md:px-8">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="h-20 w-20 text-green-500" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Order Successful!</h1>
              <p className="text-muted-foreground">
                Thank you for your purchase. We have received your order and
                will process it shortly.
              </p>
            </div>

            {/* Order Details Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Order code</p>
                    <p className="font-semibold text-lg">{code}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Order date</p>
                    <p className="font-medium">
                      {orderDetails?.created_at
                        ? new Date(orderDetails.created_at).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment method</p>
                    <p className="font-medium capitalize">
                      {orderDetails?.payment_method === "cod"
                        ? "Cash on Delivery"
                        : orderDetails?.payment_method === "vnpay"
                        ? "VNPay"
                        : orderDetails?.payment_method === "zalopay"
                        ? "ZaloPay"
                        : orderDetails?.payment_method === "paypal"
                        ? "PayPal"
                        : orderDetails?.payment_method || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">
                      {orderDetails?.order_status?.replace(/_/g, " ") ||
                        "Processing"}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Shipping Address */}
                <div>
                  <p className="text-muted-foreground text-sm mb-2">
                    Shipping address
                  </p>
                  <p className="font-medium">
                    {orderDetails?.address_street}
                    {orderDetails?.address_ward &&
                      `, ${orderDetails.address_ward}`}
                    {orderDetails?.address_district &&
                      `, ${orderDetails.address_district}`}
                    {orderDetails?.address_city &&
                      `, ${orderDetails.address_city}`}
                  </p>
                </div>

                <Separator />

                {/* Order Items */}
                {orderDetails?.items && orderDetails.items.length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-3">
                      Products
                    </p>
                    <div className="space-y-2">
                      {orderDetails.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center text-sm border-b pb-2"
                        >
                          <div className="flex-1">
                            <p className="font-medium">
                              {item.item_name_snapshot}
                            </p>
                            <p className="text-muted-foreground">
                              ${Number(item.unit_price).toFixed(2)} x {item.qty}
                            </p>
                          </div>
                          <p className="font-semibold">
                            ${Number(item.amount).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Order Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      ${Number(orderDetails?.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping fee</span>
                    <span className="font-medium">
                      ${Number(orderDetails?.shipping_fee || 0).toFixed(2)}
                    </span>
                  </div>
                  {orderDetails?.discount_amount && orderDetails.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span className="font-medium">
                        -${Number(orderDetails.discount_amount).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">
                      $
                      {Number(orderDetails?.grand_total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Important Note */}
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  📋 Lưu mã đơn hàng của bạn
                </p>
                <p className="text-sm text-blue-800">
                  Vui lòng lưu mã đơn hàng <strong>{code}</strong> để tra cứu
                  tình trạng đơn hàng. Bạn có thể tra cứu đơn hàng bất cứ lúc
                  nào bằng mã này.
                </p>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1" size="lg">
                <Link href="/products">Continue shopping</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1" size="lg">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
