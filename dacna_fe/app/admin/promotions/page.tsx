"use client";

import { useState, useEffect } from "react";
import {
  fetchAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  type AdminPromotion,
} from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Pencil, Trash2, Plus, X } from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug?: string;
  subCategories?: SubCategory[];
}

interface SubCategory {
  id: number;
  name: string;
  slug?: string;
}

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    min_order_amount: "",
    max_discount_amount: "",
    usage_limit: "",
    per_user_limit: "1",
    start_date: "",
    end_date: "",
    is_active: true,
    category_id: "",
    sub_category_id: "",
  });

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (activeFilter !== "all") params.is_active = activeFilter === "active";
      if (search) params.search = search;

      const res = await fetchAllPromotions(params);
      setPromotions(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (error) {
      console.error("Failed to load promotions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/categories");
      const j = await res.json();
      const cats = (j.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        subCategories: (c.subCategories || []).map((sc: any) => ({
          id: sc.id,
          name: sc.name,
          slug: sc.slug,
        })),
      }));
      setCategories(cats);
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  };

  useEffect(() => {
    loadPromotions();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeFilter]);

  const handleSearch = () => {
    setPage(1);
    loadPromotions();
  };

  const resetForm = () => {
    setForm({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      min_order_amount: "",
      max_discount_amount: "",
      usage_limit: "",
      per_user_limit: "1",
      start_date: "",
      end_date: "",
      is_active: true,
      category_id: "__none__",
      sub_category_id: "__none__",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (promo: AdminPromotion) => {
    setForm({
      code: promo.code,
      description: promo.description || "",
      discount_type: promo.discount_type,
      discount_value: promo.discount_value.toString(),
      min_order_amount: promo.min_order_amount?.toString() || "",
      max_discount_amount: promo.max_discount_amount?.toString() || "",
      usage_limit: promo.usage_limit?.toString() || "",
      per_user_limit: promo.per_user_limit?.toString() || "1",
      start_date: promo.start_date.split("T")[0],
      end_date: promo.end_date.split("T")[0],
      is_active: promo.is_active,
      category_id: promo.category_id
        ? promo.category_id.toString()
        : "__none__",
      sub_category_id: promo.sub_category_id
        ? promo.sub_category_id.toString()
        : "__none__",
    });
    setEditingId(promo.id);
    setShowForm(true);
  };

  const submitForm = async () => {
    try {
      const payload: any = {
        code: form.code.toUpperCase().trim(),
        description: form.description.trim() || undefined,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        start_date: form.start_date,
        end_date: form.end_date,
        is_active: form.is_active,
      };

      if (form.min_order_amount)
        payload.min_order_amount = parseFloat(form.min_order_amount);
      if (form.max_discount_amount)
        payload.max_discount_amount = parseFloat(form.max_discount_amount);
      if (form.usage_limit) payload.usage_limit = parseInt(form.usage_limit);
      if (form.per_user_limit)
        payload.per_user_limit = parseInt(form.per_user_limit);

      // Add category/sub-category targeting (convert __none__ back to empty)
      if (form.category_id && form.category_id !== "__none__") {
        payload.category_id = parseInt(form.category_id);
      }
      if (form.sub_category_id && form.sub_category_id !== "__none__") {
        payload.sub_category_id = parseInt(form.sub_category_id);
      }

      if (
        !payload.code ||
        !payload.discount_value ||
        !payload.start_date ||
        !payload.end_date
      ) {
        alert(
          "Please fill required fields: code, discount value, start/end dates"
        );
        return;
      }

      if (editingId) {
        await updatePromotion(editingId, payload);
      } else {
        await createPromotion(payload);
      }

      resetForm();
      loadPromotions();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to save promotion");
    }
  };

  const handleDelete = async (promotionId: number) => {
    if (!confirm("Are you sure you want to delete this promotion?")) return;

    try {
      await deletePromotion(promotionId);
      loadPromotions();
    } catch (error) {
      console.error("Failed to delete promotion:", error);
      alert("Failed to delete promotion");
    }
  };

  // Helper function to determine actual promotion status
  const getPromotionStatus = (promo: AdminPromotion) => {
    const now = new Date();
    const startDate = new Date(promo.start_date);
    const endDate = new Date(promo.end_date);

    // Check if expired
    if (now > endDate) {
      return { isActive: false, reason: "Expired" };
    }

    // Check if not started
    if (now < startDate) {
      return { isActive: false, reason: "Not started" };
    }

    // Check if out of usage
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return { isActive: false, reason: "Out of usage" };
    }

    // Check is_active flag
    if (!promo.is_active) {
      return { isActive: false, reason: "Disabled" };
    }

    return { isActive: true, reason: "Active" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Promotions Management
        </h1>
        <div className="flex gap-2">
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Promotion
          </Button>
          <Button onClick={loadPromotions} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search by code or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Promotions</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Form */}
      {showForm && (
        <div className="border rounded-lg p-6 bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {editingId ? "Edit Promotion" : "Create New Promotion"}
            </h2>
            <Button onClick={resetForm} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Code *</label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g., SUMMER2025"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Discount Type *</label>
              <Select
                value={form.discount_type}
                onValueChange={(v: "percentage" | "fixed") =>
                  setForm({ ...form, discount_type: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Discount Value *</label>
              <Input
                type="number"
                value={form.discount_value}
                onChange={(e) =>
                  setForm({ ...form, discount_value: e.target.value })
                }
                placeholder={
                  form.discount_type === "percentage"
                    ? "e.g., 15"
                    : "e.g., 10.00"
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Min Order Amount</label>
              <Input
                type="number"
                value={form.min_order_amount}
                onChange={(e) =>
                  setForm({ ...form, min_order_amount: e.target.value })
                }
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Discount Amount</label>
              <Input
                type="number"
                value={form.max_discount_amount}
                onChange={(e) =>
                  setForm({ ...form, max_discount_amount: e.target.value })
                }
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Total Usage Limit</label>
              <Input
                type="number"
                value={form.usage_limit}
                onChange={(e) =>
                  setForm({ ...form, usage_limit: e.target.value })
                }
                placeholder="Unlimited if empty"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Per User Limit</label>
              <Input
                type="number"
                value={form.per_user_limit}
                onChange={(e) =>
                  setForm({ ...form, per_user_limit: e.target.value })
                }
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Start Date *</label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date *</label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Apply to Category (Optional)
              </label>
              <Select
                value={form.category_id}
                onValueChange={(v) =>
                  setForm({ ...form, category_id: v, sub_category_id: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All products if empty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All Products</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">
                Apply to Sub-Category (Optional)
              </label>
              <Select
                value={form.sub_category_id}
                onValueChange={(v) => setForm({ ...form, sub_category_id: v })}
                disabled={!form.category_id}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      form.category_id
                        ? "Select sub-category"
                        : "Select category first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All in Category</SelectItem>
                  {categories
                    .find((c) => c.id.toString() === form.category_id)
                    ?.subCategories?.map((sc) => (
                      <SelectItem key={sc.id} value={sc.id.toString()}>
                        {sc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full border rounded-md p-2 bg-background"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
            <div className="md:col-span-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
                className="w-4 h-4"
              />
              <label className="text-sm font-medium">Active</label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={submitForm}>
              {editingId ? "Update" : "Create"} Promotion
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Promotions Table */}
      {loading ? (
        <div className="text-center py-8">Loading promotions...</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No promotions found
                  </TableCell>
                </TableRow>
              ) : (
                promotions.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell className="font-mono font-semibold">
                      {promo.code}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {promo.discount_type === "percentage" ? "%" : "$"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {promo.discount_type === "percentage"
                        ? `${promo.discount_value}%`
                        : `$${promo.discount_value.toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      {promo.usage_count}
                      {promo.usage_limit ? ` / ${promo.usage_limit}` : " / ∞"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>
                        {new Date(promo.start_date).toLocaleDateString()}
                      </div>
                      <div className="text-muted-foreground">
                        to {new Date(promo.end_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const status = getPromotionStatus(promo);
                        return (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={status.isActive ? "default" : "secondary"}
                            >
                              {status.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {!status.isActive && (
                              <span className="text-xs text-muted-foreground">
                                ({status.reason})
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => openEdit(promo)}
                          variant="outline"
                          size="sm"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(promo.id)}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            variant="outline"
          >
            Previous
          </Button>
          <span className="py-2 px-4">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
