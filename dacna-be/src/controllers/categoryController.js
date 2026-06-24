import * as categoryModel from "../models/categoryModel.js";

/** Get all categories with nested subcategories */
export async function listCategories(req, res, next) {
  try {
    const data = await categoryModel.getAll();
    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
}

/** Get single category details by slug */
export async function getCategoryDetails(req, res, next) {
  try {
    const { slug } = req.params;
    const data = await categoryModel.getBySlug(slug);

    if (!data) {
      return res
        .status(404)
        .json({ ok: false, message: "Không tìm thấy danh mục" });
    }

    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

/* ========== ADMIN FUNCTIONS ========== */

/**
 * [POST] /api/categories/admin
 * Create a new category (admin only)
 */
export async function createCategory(req, res, next) {
  try {
    const { name, slug, image_url } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        ok: false,
        message: "Missing required fields: name, slug",
      });
    }

    const categoryId = await categoryModel.createCategory(
      name,
      slug,
      image_url || null
    );

    res.status(201).json({
      ok: true,
      message: "Category created successfully",
      data: { categoryId },
    });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ ok: false, message: "Category slug already exists" });
    }
    next(err);
  }
}

/**
 * [PATCH] /api/categories/admin/:id
 * Update a category (admin only)
 */
export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { name, slug, image_url } = req.body;

    // Check if category exists
    const exists = await categoryModel.categoryExists(id);
    if (!exists) {
      return res.status(404).json({ ok: false, message: "Category not found" });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (image_url !== undefined) updates.image_url = image_url;

    await categoryModel.updateCategory(id, updates);

    res.json({ ok: true, message: "Category updated successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * [DELETE] /api/categories/admin/:id
 * Delete a category (admin only)
 */
export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;

    // Check if category exists
    const exists = await categoryModel.categoryExists(id);
    if (!exists) {
      return res.status(404).json({ ok: false, message: "Category not found" });
    }

    // Check if category has products
    const hasProducts = await categoryModel.categoryHasProducts(id);
    if (hasProducts) {
      return res.status(400).json({
        ok: false,
        message: "Cannot delete category with existing products",
      });
    }

    await categoryModel.deleteCategory(id);

    res.json({ ok: true, message: "Category deleted successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * [POST] /api/categories/admin/:categoryId/subcategories
 * Create a new subcategory (admin only)
 */
export async function createSubCategory(req, res, next) {
  try {
    const { categoryId } = req.params;
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        ok: false,
        message: "Missing required fields: name, slug",
      });
    }

    // Check if parent category exists
    const parentExists = await categoryModel.categoryExists(categoryId);
    if (!parentExists) {
      return res
        .status(404)
        .json({ ok: false, message: "Parent category not found" });
    }

    const subCategoryId = await categoryModel.createSubCategory(
      categoryId,
      name,
      slug
    );

    res.status(201).json({
      ok: true,
      message: "Subcategory created successfully",
      data: { subCategoryId },
    });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ ok: false, message: "Subcategory slug already exists" });
    }
    next(err);
  }
}

/**
 * [PATCH] /api/categories/admin/:categoryId/subcategories/:id
 * Update a subcategory (admin only)
 */
export async function updateSubCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { name, slug } = req.body;

    // Check if subcategory exists
    const exists = await categoryModel.subCategoryExists(id);
    if (!exists) {
      return res
        .status(404)
        .json({ ok: false, message: "Subcategory not found" });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;

    await categoryModel.updateSubCategory(id, updates);

    res.json({ ok: true, message: "Subcategory updated successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * [DELETE] /api/categories/admin/:categoryId/subcategories/:id
 * Delete a subcategory (admin only)
 */
export async function deleteSubCategory(req, res, next) {
  try {
    const { id } = req.params;

    // Check if subcategory exists
    const exists = await categoryModel.subCategoryExists(id);
    if (!exists) {
      return res
        .status(404)
        .json({ ok: false, message: "Subcategory not found" });
    }

    // Check if subcategory has products
    const hasProducts = await categoryModel.subCategoryHasProducts(id);
    if (hasProducts) {
      return res.status(400).json({
        ok: false,
        message: "Cannot delete subcategory with existing products",
      });
    }

    await categoryModel.deleteSubCategory(id);

    res.json({ ok: true, message: "Subcategory deleted successfully" });
  } catch (err) {
    next(err);
  }
}
