"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";

function PayPalCancelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderCode = searchParams.get("orderCode");

  useEffect(() => {
    async function cancelOrder() {
      const orderIdParam = searchParams.get("orderId");
      if (!orderIdParam) {
        setError("Missing order ID");
        toast.error("Cancel failed: missing order ID");
        return;
      }
      try {
        const res = await fetch(
          "http://localhost:5000/api/payment/paypal/cancel",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: parseInt(orderIdParam) }),
          }
        );
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Cancellation failed");
        }
        // Clear cart when order is successfully cancelled
        clearCart();
        toast.error("Payment cancelled. Order removed.");
        setDone(true);
      } catch (e: unknown) {
        console.error("Cancel error", e);
        setError(e instanceof Error ? e.message : "Cancel failed");
        toast.error("Cancel failed");
      }
    }
    cancelOrder();
  }, [searchParams, clearCart]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2 text-red-600">
            <XCircle className="h-6 w-6" />
            Payment Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            {error ? (
              <p className="text-red-600">{error}</p>
            ) : (
              <p className="text-muted-foreground">
                Payment cancelled.{" "}
                {done ? "Order removed." : "Processing cancellation..."}
              </p>
            )}
            {orderCode && !error && (
              <p className="text-sm text-muted-foreground">
                Previous order code:{" "}
                <span className="font-mono">{orderCode}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => router.push("/checkout")}
              className="w-full"
              variant="default"
            >
              Return to Checkout
            </Button>
            <Button
              onClick={() => router.push("/home")}
              className="w-full"
              variant="outline"
            >
              Continue Shopping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PayPalCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <PayPalCancelContent />
    </Suspense>
  );
}
