"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { fetchAllOrders, fetchAllUsers, type AdminOrder } from "@/lib/admin-api";

const API_BASE = "http://localhost:5000";

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  totalUsers: number;
  verifiedUsers: number;
}

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalUsers: 0,
    verifiedUsers: 0,
  });
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch orders - exclude 'cart' status from analytics
      const ordersRes = await fetchAllOrders({ limit: 1000, status: "paid" });
      const paidOrders = ordersRes.data || [];
      setRecentOrders(paidOrders.slice(0, 5));

      // Calculate revenue from paid orders only
      const totalRevenue = paidOrders.reduce(
        (sum, order) => sum + order.total_amount,
        0
      );
      const pendingOrders = paidOrders.filter(
        (order) => order.status === "pending" || order.status === "processing"
      ).length;

      // Fetch users
      const usersRes = await fetchAllUsers({ limit: 1 });
      const totalUsers = usersRes.pagination.total;

      // Fetch products
      const productsRes = await fetch(`${API_BASE}/api/products`);
      const productsJson = await productsRes.json();
      const products = productsJson.data || [];

      const lowStockProducts = products.filter(
        (p: any) => p.stock?.level === "low-stock" || p.stock?.level === "out-of-stock"
      ).length;

      setStats({
        totalRevenue,
        totalOrders: paidOrders.length, // Count of paid orders only, excluding cart
        pendingOrders,
        totalProducts: products.length,
        lowStockProducts,
        totalUsers,
        verifiedUsers: 0, // Would need separate query
      });
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Total Revenue",
      value: `$${Number(stats.totalRevenue).toFixed(2)}`,
      change: `From ${stats.totalOrders} orders`,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Orders",
      value: stats.totalOrders.toString(),
      change: `${stats.pendingOrders} pending`,
      icon: ShoppingCart,
      color: "text-blue-600",
    },
    {
      title: "Products",
      value: stats.totalProducts.toString(),
      change: `${stats.lowStockProducts} low stock`,
      icon: Package,
      color: "text-orange-600",
    },
    {
      title: "Users",
      value: stats.totalUsers.toString(),
      change: "Total registered",
      icon: Users,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}! Here's what's happening today.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading dashboard...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">{stat.change}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent orders</p>
                ) : (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between border-b pb-2"
                      >
                        <div>
                          <p className="font-medium">{order.order_code}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.username || order.guest_email || "Guest"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            ${Number(order.total_amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Low Stock Alert</span>
                  </div>
                  <span className="font-bold">{stats.lowStockProducts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">Pending Orders</span>
                  </div>
                  <span className="font-bold">{stats.pendingOrders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Total Users</span>
                  </div>
                  <span className="font-bold">{stats.totalUsers}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
