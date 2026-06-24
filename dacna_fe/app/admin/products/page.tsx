"use client";

import { useState, useEffect, Fragment } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  updateProductStock,
  deleteProduct,
  createProduct,
  updateProduct,
  reviveProduct,
  getDeletedProducts,
} from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Pencil, Trash2, Plus, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminAuth } from "@/hooks/use-admin-auth";

const API_BASE = "http://localhost:5000";

/**
 * Admin Products Management Page
 *
 * PERMISSIONS:
 * - ADMIN: Full access (create, edit, delete products, manage stock)
 * - STAFF: Full access (create, edit, delete products, manage stock)
 * - Customer: Cannot access (protected by layout)
 *
 * FEATURES:
 * - View all products with search functionality
 * - Create new products with images and specifications
 * - Edit existing products
 * - Delete products
 * - Manage product stock levels
 * - Both admin and staff have full access to this page
 */

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  salePrice?: number;
  category: string;
  stock: { level: string };
  stockQty?: number;
  rating: number;
}

export default function AdminProductsPage() {
  const { isAdmin, isAdminOrStaff } = useAdminAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<
    Array<{
      id: number;
      name: string;
      slug?: string;
      subCategories: Array<{ id: number; name: string; slug?: string }>;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedEditId, setExpandedEditId] = useState<string | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockProductId, setStockProductId] = useState<string | null>(null);
  const [stockProductLevel, setStockProductLevel] = useState<string>("");
  const [stockQtyInput, setStockQtyInput] = useState<string>("");
  const [showDeletedProducts, setShowDeletedProducts] = useState(false);
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    name: "",
    price: "",
    sale_price: "",
    category_id: "",
    sub_category_id: "",
    stock_qty: "",
    description: "",
    imagesText: "",
    specificationsText: "",
  });

  const normalize = (s?: string) => (s || "").trim().toLowerCase();

  const loadProducts = async () => {
    try {
      setLoading(true);
      const query = search ? `?q=${encodeURIComponent(search)}` : "";
      const res = await fetch(`${API_BASE}/api/products${query}`);
      const json = await res.json();
      setProducts(json.data || []);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/categories`);
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
    loadProducts();
    loadCategories();
  }, []);

  const handleSearch = () => loadProducts();

  const resetForm = () => {
    setForm({
      sku: "",
      name: "",
      price: "",
      sale_price: "",
      category_id: "",
      sub_category_id: "",
      stock_qty: "",
      description: "",
      imagesText: "",
      specificationsText: "",
    });
    setEditingId(null);
    setExpandedEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateForm(true);
  };

  const openEdit = async (id: string) => {
    try {
      setEditingId(id);
      setExpandedEditId(id);
      // Use a fresh snapshot of categories to avoid stale state
      let catSnapshot: Array<{
        id: number;
        name: string;
        slug?: string;
        subCategories: Array<{ id: number; name: string; slug?: string }>;
      }> = [];
      try {
        const resCats = await fetch(`${API_BASE}/api/categories`);
        const jCats = await resCats.json();
        catSnapshot = (jCats.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          subCategories: (c.subCategories || []).map((sc: any) => ({
            id: sc.id,
            name: sc.name,
            slug: sc.slug,
          })),
        }));
        // Also update state for future interactions
        setCategories(catSnapshot);
      } catch {}
      const res = await fetch(`${API_BASE}/api/products/${id}`);
      if (!res.ok) throw new Error("Failed to fetch product details");
      const j = await res.json();
      const p = j?.data || {};
      console.log("[Admin/Edit] Product detail:", {
        category_id: p.category_id,
        sub_category_id: p.sub_category_id,
        category_name: p.category_name,
        category_slug: p.category_slug,
        sub_category_name: p.sub_category_name,
        sub_category_slug: p.sub_category_slug,
      });
      // Prefer direct IDs from backend
      let categoryId = p.category_id != null ? String(p.category_id) : "";
      let subCategoryId =
        p.sub_category_id != null ? String(p.sub_category_id) : "";

      // Fallback: resolve by name/slug when IDs missing
      if (!categoryId && p.category_name) {
        const matchedCatByName = (
          catSnapshot.length ? catSnapshot : categories
        ).find((c) => normalize(c.name) === normalize(p.category_name));
        if (matchedCatByName) categoryId = matchedCatByName.id.toString();
      }
      if (!categoryId && p.category_slug) {
        const matchedCatBySlug = (
          catSnapshot.length ? catSnapshot : categories
        ).find((c) => normalize(c.slug) === normalize(p.category_slug));
        if (matchedCatBySlug) categoryId = matchedCatBySlug.id.toString();
      }
      console.log("[Admin/Edit] Resolved categoryId:", categoryId);

      if (!subCategoryId && categoryId) {
        const matchedCat = (catSnapshot.length ? catSnapshot : categories).find(
          (c) => c.id.toString() === categoryId
        );
        if (matchedCat) {
          if (p.sub_category_name) {
            const matchedSubByName = matchedCat.subCategories.find(
              (sc) => normalize(sc.name) === normalize(p.sub_category_name)
            );
            if (matchedSubByName)
              subCategoryId = matchedSubByName.id.toString();
          }
          if (!subCategoryId && p.sub_category_slug) {
            const matchedSubBySlug = matchedCat.subCategories.find(
              (sc) => normalize(sc.slug) === normalize(p.sub_category_slug)
            );
            if (matchedSubBySlug)
              subCategoryId = matchedSubBySlug.id.toString();
          }
        }
      }
      console.log("[Admin/Edit] Resolved subCategoryId:", subCategoryId);

      setForm({
        sku: p.sku || "",
        name: p.name || "",
        price: (p.price ?? "").toString(),
        sale_price: (p.salePrice ?? "").toString(),
        category_id: categoryId,
        sub_category_id: subCategoryId,
        stock_qty: "", // not provided by detail mapping
        description: p.description || "",
        imagesText: Array.isArray(p.images) ? p.images.join("\n") : "",
        specificationsText: Array.isArray(p.specifications)
          ? p.specifications.map((s: any) => `${s.key}: ${s.value}`).join("\n")
          : "",
      });
    } catch (e) {
      console.error(e);
      alert("Failed to load product detail");
      setEditingId(null);
      setExpandedEditId(null);
    }
  };

  const submitForm = async () => {
    try {
      const payload: any = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        price: Number(form.price || 0),
        category_id: Number(form.category_id || 0),
      };
      if (form.sale_price) payload.sale_price = Number(form.sale_price);
      if (form.sub_category_id)
        payload.sub_category_id = Number(form.sub_category_id);
      if (form.stock_qty) payload.stock_qty = Number(form.stock_qty);
      if (form.description) payload.description = form.description;
      if (form.imagesText)
        payload.images = form.imagesText
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean);
      // Parse specifications (format: "Key: Value" per line)
      if (form.specificationsText)
        payload.specifications = form.specificationsText
          .split(/\r?\n/)
          .map((line) => {
            const [key, ...valueParts] = line.split(":");
            return {
              key: key.trim(),
              value: valueParts.join(":").trim(),
            };
          })
          .filter((spec) => spec.key && spec.value);

      if (
        !payload.sku ||
        !payload.name ||
        !payload.price ||
        !payload.category_id
      ) {
        alert("Please fill SKU, Name, Price, Category");
        return;
      }

      if (editingId) await updateProduct(parseInt(editingId), payload);
      else await createProduct(payload);

      if (!editingId) setShowCreateForm(false);
      resetForm();
      loadProducts();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to submit product");
    }
  };

  const openStockModal = (product: Product) => {
    setStockProductId(product.id);
    setStockProductLevel(product.stock.level);
    setStockQtyInput("");
    setStockModalOpen(true);
  };

  const saveStockUpdate = async () => {
    if (!stockProductId) return;
    const qtyNum = parseInt(stockQtyInput, 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      alert("Enter a valid non-negative number");
      return;
    }
    try {
      await updateProductStock(parseInt(stockProductId), qtyNum);
      setStockModalOpen(false);
      setStockProductId(null);
      loadProducts();
    } catch (e) {
      console.error(e);
      alert("Failed to update stock");
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await deleteProduct(parseInt(productId));
      loadProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
      alert("Failed to delete product");
    }
  };

  const loadDeletedProducts = async () => {
    try {
      setLoadingDeleted(true);
      console.log('[DELETED PRODUCTS] Starting to load...');

      // Use API function with proper auth headers
      const deleted = await getDeletedProducts();

      console.log('[DELETED PRODUCTS] Response received:', JSON.stringify(deleted, null, 2));
      console.log('[DELETED PRODUCTS] Total products:', deleted.length);

      setDeletedProducts(deleted);
    } catch (error) {
      console.error("Failed to load deleted products:", error);
      alert("Failed to load deleted products: " + (error as any).message);
    } finally {
      setLoadingDeleted(false);
    }
  };

  const handleShowDeletedProducts = async () => {
    setShowDeletedProducts(true);
    await loadDeletedProducts();
  };

  const handleReviveProduct = async (productId: string) => {
    if (!confirm("Revive this product? It will be visible in listings again.")) return;

    try {
      await reviveProduct(parseInt(productId));
      alert("Product revived successfully!");
      loadDeletedProducts(); // Reload deleted products list
      loadProducts(); // Reload active products list
    } catch (error) {
      console.error("Failed to revive product:", error);
      alert("Failed to revive product");
    }
  };

  const getStockBadge = (level: string, quantity?: number) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      "in-stock": "default",
      "low-stock": "secondary",
      "out-of-stock": "destructive",
    };
    const displayText =
      level === "low-stock" && quantity !== undefined
        ? `low-stock: ${quantity} left`
        : level;
    return <Badge variant={variants[level] || "default"}>{displayText}</Badge>;
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            Products Management
          </h1>
          <div className="flex gap-2">
            {isAdminOrStaff && (
              <>
                <Button onClick={handleShowDeletedProducts} variant="outline" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deleted Products
                </Button>
                <Button onClick={openCreate} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </>
            )}
            <Button onClick={loadProducts} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Search products by name, SKU, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="text-center py-8">Loading products...</div>
        ) : (
          <div className="border rounded-lg">
            {isAdminOrStaff && showCreateForm && !editingId && (
              <div className="p-4 border-b space-y-3 bg-muted/30">
                <div className="text-sm font-semibold">Create Product</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">SKU</label>
                    <Input
                      value={form.sku}
                      onChange={(e) =>
                        setForm({ ...form, sku: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Name
                    </label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Price
                    </label>
                    <Input
                      type="number"
                      value={form.price}
                      onChange={(e) =>
                        setForm({ ...form, price: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Sale Price
                    </label>
                    <Input
                      type="number"
                      value={form.sale_price}
                      onChange={(e) =>
                        setForm({ ...form, sale_price: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Category
                    </label>
                    <select
                      key={`cat-${form.category_id}`}
                      className="w-full border rounded-md px-2 py-1 bg-background"
                      value={form.category_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          category_id: e.target.value,
                          sub_category_id: "",
                        })
                      }
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Subcategory
                    </label>
                    <select
                      key={`sub-${form.sub_category_id}-${form.category_id}`}
                      className="w-full border rounded-md px-2 py-1 bg-background"
                      value={form.sub_category_id}
                      onChange={(e) =>
                        setForm({ ...form, sub_category_id: e.target.value })
                      }
                      disabled={!form.category_id}
                    >
                      <option value="">
                        {form.category_id
                          ? "Select subcategory"
                          : "Select category first"}
                      </option>
                      {categories
                        .find((c) => c.id.toString() === form.category_id)
                        ?.subCategories.map((sc) => (
                          <option key={sc.id} value={sc.id}>
                            {sc.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Stock Qty
                    </label>
                    <Input
                      type="number"
                      value={form.stock_qty}
                      onChange={(e) =>
                        setForm({ ...form, stock_qty: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs text-muted-foreground">
                      Description
                    </label>
                    <textarea
                      className="w-full border rounded-md p-2 bg-background"
                      rows={3}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs text-muted-foreground">
                      Image URLs (one per line)
                    </label>
                    <textarea
                      className="w-full border rounded-md p-2 bg-background"
                      rows={3}
                      value={form.imagesText}
                      onChange={(e) =>
                        setForm({ ...form, imagesText: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs text-muted-foreground">
                      Specifications (Key: Value, one per line)
                    </label>
                    <textarea
                      className="w-full border rounded-md p-2 bg-background text-sm"
                      rows={3}
                      value={form.specificationsText}
                      onChange={(e) =>
                        setForm({ ...form, specificationsText: e.target.value })
                      }
                      placeholder="e.g. Color: Red&#10;Size: Large&#10;Material: Cotton"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={submitForm}>
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <Fragment key={product.id}>
                      <TableRow>
                        <TableCell className="font-mono text-sm">
                          {product.sku}
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>
                          {product.salePrice ? (
                            <div className="flex flex-col">
                              <span className="line-through text-sm text-muted-foreground">
                                ${Number(product.price).toFixed(2)}
                              </span>
                              <span className="font-semibold text-red-600">
                                ${Number(product.salePrice).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span>${Number(product.price).toFixed(2)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStockBadge(product.stock.level, product.stockQty)}
                        </TableCell>
                        <TableCell>⭐ {product.rating.toFixed(1)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => openStockModal(product)}
                              variant="outline"
                              size="sm"
                            >
                              Update Stock
                            </Button>
                            {isAdminOrStaff && (
                              <Button
                                onClick={() => openEdit(product.id)}
                                variant="outline"
                                size="sm"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                onClick={() => handleDelete(product.id)}
                                variant="destructive"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedEditId === product.id &&
                        editingId === product.id && (
                          <TableRow className="bg-muted/40">
                            <TableCell colSpan={7}>
                              <div className="space-y-3">
                                <div className="text-xs font-semibold">
                                  Edit Product #{editingId}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <label className="text-xs text-muted-foreground">
                                      SKU
                                    </label>
                                    <Input
                                      value={form.sku}
                                      onChange={(e) =>
                                        setForm({
                                          ...form,
                                          sku: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">
                                      Name
                                    </label>
                                    <Input
                                      value={form.name}
                                      onChange={(e) =>
                                        setForm({
                                          ...form,
                                          name: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">
                                      Price
                                    </label>
                                    <Input
                                      type="number"
                                      value={form.price}
                                      onChange={(e) =>
                                        setForm({
                                          ...form,
                                          price: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">
                                      Sale Price
                                    </label>
                                    <Input
                                      type="number"
                                      value={form.sale_price}
                                      onChange={(e) =>
                                        setForm({
                                          ...form,
                                          sale_price: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">
                                      Category
                                    </label>
                                    <select
                                      className="w-full border rounded-md px-2 py-1 bg-background"
                                      value={form.category_id}
                                      onChange={(e) =>
                                        setForm({
                                          ...form,
                                          category_id: e.target.value,
                                          sub_category_id: "",
                                        })
                                      }
                                    >
                                      <option value="">Select category</option>
                                      {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">
                                      Subcategory
                                    </label>
                                    <select
                                      className="w-full border rounded-md px-2 py-1 bg-background"
                                      value={form.sub_category_id}
                                      onChange={(e) =>
                                        setForm({
                                          ...form,
                                          sub_category_id: e.target.value,
                                        })
                                      }
                                      disabled={!form.category_id}
                                    >
                                      <option value="">
                                        {form.category_id
                                          ? "Select subcategory"
                                          : "Select category first"}
                                      </option>
                                      {categories
                                        .find(
                                          (c) =>
                                            c.id.toString() === form.category_id
                                        )
                                        ?.subCategories.map((sc) => (
                                          <option key={sc.id} value={sc.id}>
                                            {sc.name}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                  <div className="md:col-span-3">
                                    <label className="text-xs text-muted-foreground">
                                      Description
                                    </label>
                                    <textarea
                                      className="w-full border rounded-md p-2 bg-background"
                                      rows={3}
                                      value={form.description}
                                      onChange={(e) =>
                                        setForm({
                                          ...form,
                                          description: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="md:col-span-3">
                                    <label className="text-xs text-muted-foreground">
                                      Image URLs (one per line)
                                    </label>
                                    <textarea
                                      className="w-full border rounded-md p-2 bg-background"
                                      rows={3}
                                      value={form.imagesText}
                                      onChange={(e) =>
                                        setForm({
                                          ...form,
                                          imagesText: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={submitForm}>
                                    Save Changes
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={resetForm}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Stock Update Modal */}
      <AlertDialog
        open={stockModalOpen}
        onOpenChange={(o) => !o && setStockModalOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Stock Quantity</AlertDialogTitle>
            <AlertDialogDescription>
              {stockProductId ? (
                <span>
                  Product ID: {stockProductId}. Current status:{" "}
                  {stockProductLevel}. Set a new stock quantity. Use 0 to mark
                  out-of-stock.
                </span>
              ) : (
                "Select a product to update stock"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              New Quantity
            </label>
            <Input
              type="number"
              min={0}
              value={stockQtyInput}
              onChange={(e) => setStockQtyInput(e.target.value)}
              placeholder="e.g. 25"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStockModalOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={saveStockUpdate}
              disabled={!stockQtyInput.trim()}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deleted Products Modal */}
      <Sheet open={showDeletedProducts} onOpenChange={setShowDeletedProducts}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>Deleted Products</SheetTitle>
            <SheetDescription>
              Manage deleted products. You can revive them at any time.
            </SheetDescription>
          </SheetHeader>

          {loadingDeleted ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 px-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Loading deleted products...</p>
              </div>
            </div>
          ) : deletedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 px-4">
              <RotateCcw className="h-12 w-12 text-muted-foreground opacity-50" />
              <div className="text-center">
                <h3 className="text-lg font-medium">No deleted products</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  All products are currently active.
                </p>
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 min-h-0 px-4">
                <div className="space-y-3">
                  {deletedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-start justify-between p-3 border rounded-lg opacity-75 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex-1 space-y-1">
                        <h4 className="font-medium">{product.name}</h4>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>SKU: <span className="font-mono">{product.sku}</span></p>
                          <p>Price: ${product.price?.toFixed(2) || "0.00"}</p>
                          <p>Stock: {product.stockQty ?? product.stock?.level || "N/A"}</p>
                          <p>Category: {product.category}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleReviveProduct(product.id)}
                        size="sm"
                        variant="outline"
                        className="gap-2 ml-2 whitespace-nowrap"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Revive
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <SheetFooter className="mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowDeletedProducts(false)}
                >
                  Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
