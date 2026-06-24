import { pool } from "../db.js";

/** Get all categories with nested subcategories */
export async function getAll() {
  const [categories] = await pool.execute(
    "SELECT id, name, slug, image_url FROM categories ORDER BY name ASC"
  );

  const [subCategories] = await pool.execute(
    "SELECT id, category_id, name, slug FROM sub_categories ORDER BY name ASC"
  );

  // Nest subcategories under their parent category
  return categories.map((cat) => ({
    ...cat,
    subCategories: subCategories.filter((sub) => sub.category_id === cat.id),
  }));
}

/** Get single category by slug with subcategories */
export async function getBySlug(slug) {
  const [rows] = await pool.execute(
    "SELECT id, name, slug, image_url FROM categories WHERE slug = ? LIMIT 1",
    [slug]
  );

  if (rows.length === 0) return null;

  const category = rows[0];

  const [subCategories] = await pool.execute(
    "SELECT id, category_id, name, slug FROM sub_categories WHERE category_id = ? ORDER BY name ASC",
    [category.id]
  );

  return { ...category, subCategories };
}

/** Create a new category */
export async function createCategory(name, slug, image_url = null) {
  const [result] = await pool.execute(
    `INSERT INTO categories (name, slug, image_url) VALUES (?, ?, ?)`,
    [name, slug, image_url]
  );
  return result.insertId;
}

/** Check if category exists by ID */
export async function categoryExists(id) {
  const [rows] = await pool.execute(`SELECT id FROM categories WHERE id = ?`, [
    id,
  ]);
  return rows.length > 0;
}

/** Check if category has products */
export async function categoryHasProducts(id) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = 1`,
    [id]
  );
  return rows[0].count > 0;
}

/** Update a category with dynamic fields */
export async function updateCategory(id, updates) {
  if (!updates || Object.keys(updates).length === 0) {
    return 0;
  }

  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.slug !== undefined) {
    fields.push("slug = ?");
    values.push(updates.slug);
  }
  if (updates.image_url !== undefined) {
    fields.push("image_url = ?");
    values.push(updates.image_url);
  }

  if (fields.length === 0) return 0;

  values.push(id);

  const [result] = await pool.execute(
    `UPDATE categories SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  return result.affectedRows;
}

/** Delete a category */
export async function deleteCategory(id) {
  const [result] = await pool.execute(`DELETE FROM categories WHERE id = ?`, [
    id,
  ]);
  return result.affectedRows;
}

/** Create a new subcategory */
export async function createSubCategory(categoryId, name, slug) {
  const [result] = await pool.execute(
    `INSERT INTO sub_categories (category_id, name, slug) VALUES (?, ?, ?)`,
    [categoryId, name, slug]
  );
  return result.insertId;
}

/** Check if subcategory exists by ID */
export async function subCategoryExists(id) {
  const [rows] = await pool.execute(
    `SELECT id FROM sub_categories WHERE id = ?`,
    [id]
  );
  return rows.length > 0;
}

/** Check if subcategory has products */
export async function subCategoryHasProducts(id) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as count FROM products WHERE sub_category_id = ? AND is_active = 1`,
    [id]
  );
  return rows[0].count > 0;
}

/** Update a subcategory with dynamic fields */
export async function updateSubCategory(id, updates) {
  if (!updates || Object.keys(updates).length === 0) {
    return 0;
  }

  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.slug !== undefined) {
    fields.push("slug = ?");
    values.push(updates.slug);
  }

  if (fields.length === 0) return 0;

  values.push(id);

  const [result] = await pool.execute(
    `UPDATE sub_categories SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  return result.affectedRows;
}

/** Delete a subcategory */
export async function deleteSubCategory(id) {
  const [result] = await pool.execute(
    `DELETE FROM sub_categories WHERE id = ?`,
    [id]
  );
  return result.affectedRows;
}
