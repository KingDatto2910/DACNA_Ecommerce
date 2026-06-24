"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { getAuthToken } from "@/lib/auth-token";
import { TrendingUp, ShoppingCart, Package, DollarSign } from "lucide-react";

const API_BASE = "http://localhost:5000";

interface DailyAnalytics {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  ordersCount: {
    cart: number;
    paid: number;
    processing: number;
    shipping: number;
    delivered: number;
    cancelled: number;
  };
  topProducts: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    revenue: number;
  }>;
}

export default function AdminAnalyticsPage() {
  const { isAdminOrStaff } = useAdminAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [analytics, setAnalytics] = useState<DailyAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fetchAnalytics = async (date: Date) => {
    try {
      setLoading(true);
      setError(null);
      const dateStr = formatDate(date);
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE}/api/analytics/daily?date=${dateStr}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch analytics"
      );
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminOrStaff) {
      fetchAnalytics(selectedDate);
    }
  }, [selectedDate, isAdminOrStaff]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  if (!isAdminOrStaff) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Orders",
      value: analytics?.totalOrders || 0,
      icon: ShoppingCart,
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Total Revenue",
      value: `$${(analytics?.totalRevenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: "bg-green-100 text-green-600",
    },
    {
      title: "Delivered Orders",
      value: analytics?.ordersCount.delivered || 0,
      icon: Package,
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Pending/Processing",
      value:
        (analytics?.ordersCount.processing || 0) +
        (analytics?.ordersCount.shipping || 0),
      icon: TrendingUp,
      color: "bg-orange-100 text-orange-600",
    },
  ];

  const orderStatusLabels = {
    cart: "Cart",
    paid: "Paid",
    processing: "Processing",
    shipping: "Shipping",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Report</h1>
        <Button onClick={() => fetchAnalytics(selectedDate)} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Calendar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const checkDate = new Date(date);
                checkDate.setHours(0, 0, 0, 0);
                return checkDate > today || checkDate < new Date("2020-01-01");
              }}
            />
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="md:col-span-2 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Loading analytics...</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2">
              {statCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-500 font-medium">
                            {card.title}
                          </p>
                          <p className="text-2xl font-bold mt-2">
                            {card.value}
                          </p>
                        </div>
                        <div className={`p-3 rounded-lg ${card.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Details Section */}
      {analytics && !loading && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Order Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analytics.ordersCount).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                        <span className="text-sm font-medium">
                          {
                            orderStatusLabels[
                              status as keyof typeof orderStatusLabels
                            ]
                          }
                        </span>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          {analytics.topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.topProducts.map((product, i) => (
                    <div key={i} className="border-b pb-3 last:border-b-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm line-clamp-1">
                          {product.productName}
                        </p>
                        <p className="font-semibold text-green-600">
                          ${product.revenue.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Quantity sold: {product.quantity}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Payment Methods */}
      {analytics && analytics.paymentMethods.length > 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {analytics.paymentMethods.map((payment, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-4 space-y-2 hover:shadow-md transition-shadow"
                >
                  <p className="text-sm font-medium text-gray-500 capitalize">
                    {payment.method}
                  </p>
                  <p className="text-2xl font-bold">{payment.count}</p>
                  <p className="text-sm text-green-600">
                    ${payment.revenue.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
