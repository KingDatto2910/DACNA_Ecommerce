import * as productModel from "../models/productModel.js";
import * as promotionModel from "../models/promotionModel.js";
import { pool } from "../db.js";

/**
 * List products with filters and sorting
 * Query params: category_slug, sub_category_slug, q, trending, bestseller,
 *               toprated, min_price, max_price, sort
 */
export async function listProducts(req, res, next) {
  try {
    const {
      category_slug,
      sub_category_slug,
      q,
      trending,
      bestseller,
      toprated,
      min_price,
      max_price,
      sort,
      include_deleted,
    } = req.query;

    const options = {
      categorySlug: category_slug,
      subCategorySlug: sub_category_slug,
      q: q,
      isTrending: trending === "true",
      isBestSeller: bestseller === "true",
      isTopRated: toprated === "true",
      minPrice: min_price ? parseFloat(min_price) : undefined,
      maxPrice: max_price ? parseFloat(max_price) : undefined,
      sortBy: sort, // Options: price-asc, price-desc, rating, newest
      includeDeleted: include_deleted === "true",
    };

    const data = await productModel.list(options);

    // Transform DB format to frontend format and fetch applicable promotions for each
    const feProducts = await Promise.all(
      data.map(async (p) => {
        // Fetch applicable promotions for this product
        const applicablePromotions =
          await promotionModel.getApplicablePromotions(
            p.category_id,
            p.sub_category_id
          );

        return {
          id: p.id.toString(),
          name: p.name,
          price: parseFloat(p.price),
          salePrice: p.sale_price ? parseFloat(p.sale_price) : undefined,
          images: [p.thumbnail_url || "/public/placeholder.svg"],
          category: p.category_name,
          categorySlug: p.category_slug,
          subCategory: p.sub_category_name || undefined,
          subCategorySlug: p.sub_category_slug || undefined,
          rating: parseFloat(p.average_rating),
          reviewCount: p.review_count,
          isBestSeller: p.is_bestseller === 1,
          isTrending: p.is_trending === 1,
          sku: p.sku,
          model: p.model,
          // Fields required by FE but not in list query
          description: "",
          specifications: [],
          stockQty: p.stock_qty,
          stock: {
            level:
              p.stock_qty > 10
                ? "in-stock"
                : p.stock_qty > 0
                ? "low-stock"
                : "out-of-stock",
            storeAddress: "",
          },
          reviews: [],
          // Include applicable promotions
          applicablePromotions: applicablePromotions.map((promo) => ({
            id: promo.id,
            code: promo.code,
            discount_type: promo.discount_type,
            discount_value: promo.discount_value,
            description: promo.description,
          })),
        };
      })
    );

    res.json({ ok: true, count: feProducts.length, data: feProducts });
  } catch (err) {
    next(err);
  }
}

/**
 * Get product details by ID
 */
export async function getProductDetails(req, res, next) {
  console.log("📍 getProductDetails called with id:", req.params.id);
  try {
    const { id } = req.params;
    const data = await productModel.getById(id);

    if (!data) {
      return res
        .status(404)
        .json({ ok: false, message: "Không tìm thấy sản phẩm" });
    }

    // Debug logging
    console.log("🛍️ Product Details:", {
      id: data.id,
      category_id: data.category_id,
      sub_category_id: data.sub_category_id,
    });

    // Fetch applicable promotions based on category/sub-category
    const applicablePromotions = await promotionModel.getApplicablePromotions(
      data.category_id,
      data.sub_category_id
    );
    console.log(
      "🎁 Applicable Promotions Found:",
      applicablePromotions.length,
      applicablePromotions
    );

    // Chuyển đổi cấu trúc DB sang cấu trúc FE mong muốn
    const feProduct = {
      id: data.id.toString(),
      name: data.name,
      description: data.description,
      price: parseFloat(data.price),
      salePrice: data.sale_price ? parseFloat(data.sale_price) : undefined,
      images:
        data.images.length > 0 ? data.images : ["/public/placeholder.svg"],
      category: data.category_name,
      categorySlug: data.category_slug,
      subCategory: data.sub_category_name || undefined,
      subCategorySlug: data.sub_category_slug || undefined,
      category_id: data.category_id ?? null,
      sub_category_id: data.sub_category_id ?? null,
      rating: parseFloat(data.average_rating),
      reviewCount: data.review_count,
      isBestSeller: data.is_bestseller === 1,
      isTrending: data.is_trending === 1,
      sku: data.sku,
      model: data.model,
      specifications: data.specifications,
      stockQty: data.stock_qty,
      // Chuyển đổi stock_qty (số) sang stock (đối tượng)
      stock: {
        level:
          data.stock_qty > 10
            ? "in-stock"
            : data.stock_qty > 0
            ? "low-stock"
            : "out-of-stock",
        storeAddress: "123 Main St, Ho Chi Minh City", // (Fake)
      },
      reviews: data.reviews.map((r) => ({
        ...r,
        isVerified: r.isVerified === 1,
        // Format lại ngày
        date: new Date(r.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      })),
      // Include applicable promotions
      applicablePromotions: applicablePromotions.map((p) => ({
        id: p.id,
        code: p.code,
        discount_type: p.discount_type,
        discount_value: p.discount_value,
        description: p.description,
      })),
    };

    res.json({ ok: true, data: feProduct });
  } catch (err) {
    next(err);
  }
}

/**
 * [POST] /api/products/:id/reviews
 * Create a new review for a product
 * Requires authentication
 */
export async function createReview(req, res, next) {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "You must be logged in to write a review",
      });
    }

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ ok: false, message: "Rating must be between 1 and 5" });
    }
    if (!comment || !comment.trim()) {
      return res
        .status(400)
        .json({ ok: false, message: "Review comment is required" });
    }

    const reviewData = {
      userId: req.user.id,
      rating: Number(rating),
      title: null,
      comment: comment.trim(),
      authorName: req.user.username || req.user.name || "User", // Fallback if username is undefined
      isVerifiedPurchase: true, // Always verified since user is logged in
    };

    const reviewId = await productModel.createReview(id, reviewData);

    res.status(201).json({
      ok: true,
      message: "Review created successfully",
      data: { reviewId },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * [PATCH] /api/products/:productId/reviews/:reviewId
 * Update a review (only by the author)
 */
export async function updateReview(req, res, next) {
  try {
    const { productId, reviewId } = req.params;
    const { rating, comment } = req.body;

    if (!req.user) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ ok: false, message: "Rating must be between 1 and 5" });
    }
    if (!comment || !comment.trim()) {
      return res
        .status(400)
        .json({ ok: false, message: "Review comment is required" });
    }

    // Check if review exists and belongs to the user
    const review = await productModel.getReviewById(reviewId);
    if (!review) {
      return res.status(404).json({ ok: false, message: "Review not found" });
    }

    if (review.user_id !== req.user.id) {
      return res
        .status(403)
        .json({ ok: false, message: "You can only edit your own reviews" });
    }

    // Update review
    const success = await productModel.updateReview(reviewId, {
      rating: Number(rating),
      comment: comment.trim(),
    });

    if (!success) {
      return res
        .status(500)
        .json({ ok: false, message: "Failed to update review" });
    }

    // Update product rating stats
    await productModel.updateProductRating(productId);

    res.json({
      ok: true,
      message: "Review updated successfully",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * [DELETE] /api/products/:productId/reviews/:reviewId
 * Delete a review (only by the author)
 */
export async function deleteReview(req, res, next) {
  try {
    const { productId, reviewId } = req.params;

    if (!req.user) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    // Check if review exists and belongs to the user
    const review = await productModel.getReviewById(reviewId);
    if (!review) {
      return res.status(404).json({ ok: false, message: "Review not found" });
    }

    if (review.user_id !== req.user.id) {
      return res
        .status(403)
        .json({ ok: false, message: "You can only delete your own reviews" });
    }

    // Delete review
    const success = await productModel.deleteReview(reviewId);

    if (!success) {
      return res
        .status(500)
        .json({ ok: false, message: "Failed to delete review" });
    }

    // Update product rating stats
    await productModel.updateProductRating(productId);

    res.json({
      ok: true,
      message: "Review deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}

/* ========== ADMIN FUNCTIONS ========== */

/**
 * [POST] /api/products/admin
 * Create a new product (admin only)
 */
export async function createProduct(req, res, next) {
  try {
    const {
      sku,
      name,
      model,
      description,
      price,
      sale_price,
      category_id,
      sub_category_id,
      stock_qty,
      is_trending,
      is_bestseller,
      specifications,
      images,
    } = req.body;

    // Validation
    if (!sku || !name || !price || !category_id) {
      return res.status(400).json({
        ok: false,
        message: "Missing required fields: sku, name, price, category_id",
      });
    }

    const productId = await productModel.createProduct({
      sku,
      name,
      model,
      description,
      price,
      sale_price,
      category_id,
      sub_category_id,
      stock_qty,
      is_trending,
      is_bestseller,
      specifications,
      images,
    });

    res.status(201).json({
      ok: true,
      message: "Product created successfully",
      data: { productId },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * [PATCH] /api/products/admin/:id
 * Update a product (admin only)
 */
export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;

    const success = await productModel.updateProduct(id, req.body);

    if (!success) {
      return res.status(404).json({ ok: false, message: "Product not found" });
    }

    res.json({ ok: true, message: "Product updated successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * [DELETE] /api/products/admin/:id
 * Delete a product (admin only)
 */
export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await productModel.getById(id);
    if (!product) {
      return res.status(404).json({ ok: false, message: "Product not found" });
    }

    console.log(`[DELETE PRODUCT] Deleting product ID: ${id}`);

    // Delete product and related data
    const deleted = await productModel.deleteProduct(id);

    if (!deleted) {
      console.warn(`[DELETE PRODUCT] Product ${id} not deleted (no rows affected)`);
      return res.status(400).json({
        ok: false,
        message: "Failed to delete product - no rows affected"
      });
    }

    console.log(`[DELETE PRODUCT] Product ${id} deleted successfully`);
    res.json({ ok: true, message: "Product deleted successfully" });
  } catch (err) {
    console.error(`[DELETE PRODUCT] Error deleting product ${req.params.id}:`, err);
    next(err);
  }
}

/**
 * [PATCH] /api/products/admin/:id/revive
 * Revive a deleted product (set is_active to 1)
 */
export async function reviveProduct(req, res, next) {
  try {
    const { id } = req.params;

    console.log(`[REVIVE PRODUCT] Reviving product ID: ${id}`);

    // Check if product exists
    const [rows] = await pool.execute(
      "SELECT id, is_active FROM products WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, message: "Product not found" });
    }

    const product = rows[0];

    if (product.is_active === 1) {
      return res.status(400).json({
        ok: false,
        message: "Product is already active"
      });
    }

    // Set is_active to 1
    const [result] = await pool.execute(
      "UPDATE products SET is_active = 1, updated_at = NOW() WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      console.warn(`[REVIVE PRODUCT] Product ${id} not revived (no rows affected)`);
      return res.status(400).json({
        ok: false,
        message: "Failed to revive product - no rows affected"
      });
    }

    console.log(`[REVIVE PRODUCT] Product ${id} revived successfully`);
    res.json({ ok: true, message: "Product revived successfully" });
  } catch (err) {
    console.error(`[REVIVE PRODUCT] Error reviving product ${req.params.id}:`, err);
    next(err);
  }
}

/**
 * [PATCH] /api/products/admin/:id/stock
 * Update product stock (admin & staff)
 */
export async function updateProductStock(req, res, next) {
  try {
    const { id } = req.params;
    const { stock_qty } = req.body;

    if (stock_qty === undefined || stock_qty < 0) {
      return res.status(400).json({
        ok: false,
        message: "Invalid stock_qty (must be >= 0)",
      });
    }

    const success = await productModel.updateProductStock(id, stock_qty);

    if (!success) {
      return res.status(404).json({ ok: false, message: "Product not found" });
    }

    res.json({ ok: true, message: "Stock updated successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * [GET] /api/products/admin/deleted
 * Get all deleted products (admin only)
 */
export async function getDeletedProducts(req, res, next) {
  try {
    console.log('[GET DELETED PRODUCTS] ===== START =====');
    console.log('[GET DELETED PRODUCTS] User:', req.user);
    console.log('[GET DELETED PRODUCTS] Fetching deleted products...');

    const query = `SELECT p.id, p.sku, p.name, p.model, p.price, p.sale_price, p.stock_qty, 
              p.category_id, p.sub_category_id, p.is_active, p.updated_at,
              c.name AS category_name,
              (SELECT img.image_url FROM product_images img 
               WHERE img.product_id = p.id 
               ORDER BY img.is_thumbnail DESC, img.display_order ASC
               LIMIT 1) AS thumbnail_url
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = 0
       ORDER BY p.updated_at DESC`;

    console.log('[GET DELETED PRODUCTS] Executing query...');
    const [rows] = await pool.execute(query);

    console.log(`[GET DELETED PRODUCTS] Query result - Found ${rows.length} deleted products`);
    if (rows.length > 0) {
      console.log('[GET DELETED PRODUCTS] First row:', JSON.stringify(rows[0], null, 2));
    }

    // Transform to frontend format
    const deletedProducts = rows.map((p, idx) => {
      const transformed = {
        id: p.id.toString(),
        sku: p.sku,
        name: p.name,
        model: p.model || '',
        price: parseFloat(p.price),
        sale_price: p.sale_price ? parseFloat(p.sale_price) : null,
        stockQty: p.stock_qty,
        category: p.category_name || 'N/A',
        category_id: p.category_id,
        sub_category_id: p.sub_category_id,
        is_active: p.is_active,
        thumbnail_url: p.thumbnail_url,
      };
      if (idx === 0) {
        console.log('[GET DELETED PRODUCTS] Transformed first product:', JSON.stringify(transformed, null, 2));
      }
      return transformed;
    });

    console.log(`[GET DELETED PRODUCTS] Transformed ${deletedProducts.length} products`);
    console.log('[GET DELETED PRODUCTS] Response data:', JSON.stringify(deletedProducts, null, 2));

    const response = { ok: true, data: deletedProducts };
    console.log('[GET DELETED PRODUCTS] Sending response:', JSON.stringify(response, null, 2));
    console.log('[GET DELETED PRODUCTS] ===== END =====');

    res.json(response);
  } catch (err) {
    console.error('[GET DELETED PRODUCTS] ===== ERROR =====');
    console.error('[GET DELETED PRODUCTS] Error:', err);
    console.error('[GET DELETED PRODUCTS] Stack:', err.stack);
    next(err);
  }
}
