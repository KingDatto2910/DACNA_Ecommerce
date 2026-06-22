"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiTrackOrderByCode, TrackedOrder } from "@/lib/order-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TrackOrderClient() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter an order code");
      return;
    }
    setIsLoading(true);
    setOrder(null);
    try {
      const data = await apiTrackOrderByCode(code.trim());
      setOrder(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to track order");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="Order code (e.g. OD169945...)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Track
        </Button>
      </form>

      {order && <OrderResult order={order} />}
    </div>
  );
}

function OrderResult({ order }: { order: TrackedOrder }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Order {order.order_code}</span>
          <StatusBadge status={order.order_status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-1">Shipping Address</h3>
            <p className="text-muted-foreground">
              {order.address_street}
              {order.address_ward ? ", " + order.address_ward : ""}
              {order.address_district ? ", " + order.address_district : ""}
              {order.address_city ? ", " + order.address_city : ""}
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">Payment</h3>
            <p className="text-muted-foreground capitalize">
              Method: {order.payment_method || "--"}
              <br /> Status: {order.payment_status || "--"}
            </p>
          </div>
        </div>
        <Separator />
        <div>
          <h3 className="font-medium mb-2">Items</h3>
          <ul className="divide-y text-sm">
            {order.items.map((it) => (
              <li key={it.id} className="py-2 flex justify-between">
                <span>
                  {it.item_name_snapshot} × {it.qty}
                </span>
                <span className="font-medium">
                  ${Number(it.amount).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Separator />
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>${Number(order.shipping_fee).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${Number(order.grand_total).toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const base = "px-2 py-1 rounded text-xs font-medium";
  const map: Record<string, string> = {
    cart: "bg-gray-100 text-gray-700",
    awaiting_payment: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    shipping: "bg-blue-100 text-blue-700",
    delivered: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={base + " " + (map[status] || "bg-slate-100 text-slate-600")}
    >
      {status}
    </span>
  );
}
