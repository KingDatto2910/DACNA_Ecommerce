"use client";

import { useState, useEffect } from "react";
import {
  createCategory,
  updateCategory,
  createSubCategory,
  updateSubCategory,
  deleteCategory,
  deleteSubCategory,
} from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Plus, Pencil, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";

const API_BASE = "http://localhost:5000";

/**
 * Admin Categories Management Page
 *
 * PERMISSIONS:
 * - ADMIN: Full access (create, edit, delete categories and subcategories)
 * - STAFF: Full access (create, edit, delete categories and subcategories)
 * - Customer: Cannot access (protected by layout)
 *
 * FEATURES:
 * - View all categories with their subcategories
 * - Create new categories with slug and image
 * - Edit existing categories
 * - Delete categories
 * - Manage subcategories for each category
 * - Both admin and staff have full access to this page
 */

interface Category {
  id: number;
  name: string;
  slug: string;
  image_url?: string;
  subCategories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

export default function AdminCategoriesPage() {
  const { isAdminOrStaff } = useAdminAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catForm, setCatForm] = useState({ name: "", slug: "", image_url: "" });
  const [addSubForCat, setAddSubForCat] = useState<number | null>(null);
  const [subForm, setSubForm] = useState({ name: "", slug: "" });
  const [editingSub, setEditingSub] = useState<{
    catId: number;
    subId: number;
  } | null>(null);
  const [editSubForm, setEditSubForm] = useState({ name: "", slug: "" });

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/categories`);
      const json = await res.json();
      setCategories(json.data || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateCategory = () => {
    setEditingCatId(null);
    setCatForm({ name: "", slug: "", description: "", image_url: "" });
    setShowCatForm(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatForm({
      name: cat.name,
      slug: cat.slug,
      image_url: cat.image_url || "",
    });
    setShowCatForm(true);
  };

  const submitCategory = async () => {
    try {
      if (!catForm.name || !catForm.slug) {
        alert("Please fill name and slug");
        return;
      }
      if (editingCatId) {
        await updateCategory(editingCatId, catForm);
      } else {
        await createCategory(catForm);
      }
      setShowCatForm(false);
      setEditingCatId(null);
      setCatForm({ name: "", slug: "", image_url: "" });
      loadCategories();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to submit category");
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm("Are you sure? This will also delete all subcategories."))
      return;

    try {
      await deleteCategory(categoryId);
      loadCategories();
    } catch (error) {
      console.error("Failed to delete category:", error);
      alert("Failed to delete category. It may have products.");
    }
  };

  const handleDeleteSubCategory = async (
    categoryId: number,
    subCategoryId: number
  ) => {
    if (!confirm("Are you sure you want to delete this subcategory?")) return;

    try {
      await deleteSubCategory(categoryId, subCategoryId);
      loadCategories();
    } catch (error) {
      console.error("Failed to delete subcategory:", error);
      alert("Failed to delete subcategory. It may have products.");
    }
  };

  const openAddSub = (catId: number) => {
    setAddSubForCat(catId);
    setSubForm({ name: "", slug: "" });
  };

  const submitAddSub = async (catId: number) => {
    try {
      if (!subForm.name || !subForm.slug) {
        alert("Please fill name and slug");
        return;
      }
      await createSubCategory(catId, subForm);
      setAddSubForCat(null);
      setSubForm({ name: "", slug: "" });
      loadCategories();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to add subcategory");
    }
  };

  const openEditSub = (
    catId: number,
    sub: { id: number; name: string; slug: string }
  ) => {
    setEditingSub({ catId, subId: sub.id });
    setEditSubForm({ name: sub.name, slug: sub.slug });
  };

  const submitEditSub = async () => {
    try {
      if (!editingSub) return;
      const { catId, subId } = editingSub;
      await updateSubCategory(catId, subId, editSubForm);
      setEditingSub(null);
      loadCategories();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to update subcategory");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Categories Management
        </h1>
        <div className="flex gap-2">
          {isAdminOrStaff && (
            <Button onClick={openCreateCategory} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          )}
          <Button onClick={loadCategories} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading categories...</div>
      ) : (
        <div className="space-y-4">
          {isAdminOrStaff && showCatForm && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="text-sm font-semibold mb-3">
                {editingCatId
                  ? `Edit Category #${editingCatId}`
                  : "Create Category"}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <input
                    className="w-full border rounded-md p-2 bg-background"
                    value={catForm.name}
                    onChange={(e) =>
                      setCatForm({ ...catForm, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Slug</label>
                  <input
                    className="w-full border rounded-md p-2 bg-background"
                    value={catForm.slug}
                    onChange={(e) =>
                      setCatForm({ ...catForm, slug: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Image URL
                  </label>
                  <input
                    className="w-full border rounded-md p-2 bg-background"
                    value={catForm.image_url}
                    onChange={(e) =>
                      setCatForm({ ...catForm, image_url: e.target.value })
                    }
                  />
                </div>
                {/* description removed (not in schema) */}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={submitCategory}>
                  {editingCatId ? "Save Changes" : "Create"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCatForm(false);
                    setEditingCatId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {categories.map((category) => (
            <div key={category.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {category.slug}
                  </p>
                  {category.description && (
                    <p className="text-sm mt-1">{category.description}</p>
                  )}
                </div>
                {isAdminOrStaff && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openAddSub(category.id)}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Subcategory
                    </Button>
                    <Button
                      onClick={() => openEditCategory(category)}
                      variant="outline"
                      size="sm"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteCategory(category.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {isAdminOrStaff && addSubForCat === category.id && (
                <div className="mb-4 p-3 rounded-md border bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Name
                      </label>
                      <input
                        className="w-full border rounded-md p-2 bg-background"
                        value={subForm.name}
                        onChange={(e) =>
                          setSubForm({ ...subForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Slug
                      </label>
                      <input
                        className="w-full border rounded-md p-2 bg-background"
                        value={subForm.slug}
                        onChange={(e) =>
                          setSubForm({ ...subForm, slug: e.target.value })
                        }
                      />
                    </div>
                    {/* description removed (not in schema) */}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => submitAddSub(category.id)}>
                      Create
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddSubForCat(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {category.subCategories && category.subCategories.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Subcategories:</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        {isAdminOrStaff && (
                          <TableHead className="text-right">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.subCategories.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>{sub.name}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {sub.slug}
                          </TableCell>
                          {isAdminOrStaff && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {editingSub &&
                                editingSub.catId === category.id &&
                                editingSub.subId === sub.id ? (
                                  <>
                                    <input
                                      className="border rounded-md px-2 py-1 text-sm"
                                      placeholder="Name"
                                      value={editSubForm.name}
                                      onChange={(e) =>
                                        setEditSubForm({
                                          ...editSubForm,
                                          name: e.target.value,
                                        })
                                      }
                                    />
                                    <input
                                      className="border rounded-md px-2 py-1 text-sm"
                                      placeholder="Slug"
                                      value={editSubForm.slug}
                                      onChange={(e) =>
                                        setEditSubForm({
                                          ...editSubForm,
                                          slug: e.target.value,
                                        })
                                      }
                                    />
                                    {/* description removed */}
                                    <Button size="sm" onClick={submitEditSub}>
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingSub(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    onClick={() =>
                                      openEditSub(category.id, sub)
                                    }
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  onClick={() =>
                                    handleDeleteSubCategory(category.id, sub.id)
                                  }
                                  variant="destructive"
                                  size="sm"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
