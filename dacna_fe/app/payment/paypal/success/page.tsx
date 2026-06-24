"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function PayPalSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get("token");
  const orderId = searchParams.get("orderId");
  const orderCode = searchParams.get("orderCode");

  useEffect(() => {
    const capturePayment = async () => {
      if (!token || !orderId) {
        setError("Missing payment information");
        setIsProcessing(false);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:5000/api/payment/paypal/capture?token=${token}&orderId=${orderId}`,
          {
            method: "GET",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error("❌ PayPal capture failed:", data);
          throw new Error(data.error || "Failed to capture payment");
        }

        if (data.ok) {
          console.log("✅ Payment captured successfully");
          toast.success("Payment completed successfully!");
          setIsProcessing(false);

          // Redirect to order success page after 2 seconds
          setTimeout(() => {
            router.push(`/order-success?orderId=${orderId}&code=${orderCode}`);
          }, 2000);
        } else {
          throw new Error(data.error || "Payment failed");
        }
      } catch (err) {
        console.error("❌ Payment capture error:", err);
        setError(err instanceof Error ? err.message : "Payment failed");
        setIsProcessing(false);
        toast.error("Payment capture failed");
      }
    };

    capturePayment();
  }, [token, orderId, orderCode, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            {isProcessing ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                Processing Payment
              </>
            ) : error ? (
              "Payment Failed"
            ) : (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                Payment Successful
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isProcessing ? (
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                Please wait while we process your PayPal payment...
              </p>
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <p className="text-center text-red-600">{error}</p>
              <Button
                onClick={() => router.push("/checkout")}
                className="w-full"
                variant="destructive"
              >
                Return to Checkout
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                Your payment has been processed successfully.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to order confirmation...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PayPalSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <PayPalSuccessContent />
    </Suspense>
  );
}
