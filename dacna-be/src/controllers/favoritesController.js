import * as favoritesModel from "../models/favoritesModel.js";

export async function getMyFavorites(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "Unauthorized" });
    const rows = await favoritesModel.listFavorites(req.user.id);
    // Map to simplified product shape
    const products = rows.map(r => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      model: r.model,
      price: r.price,
      sale_price: r.sale_price,
      average_rating: r.average_rating,
      review_count: r.review_count,
      category_slug: r.category_slug,
      sub_category_slug: r.sub_category_slug,
      thumbnail_url: r.thumbnail_url,
    }));
    res.json({ ok: true, data: products });
  } catch (err) { next(err); }
}

export async function addFavorite(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "Unauthorized" });
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ ok: false, error: "Missing product_id" });
    await favoritesModel.addFavorite(req.user.id, +product_id);
    res.json({ ok: true, message: "Added to favorites" });
  } catch (err) { next(err); }
}

export async function removeFavorite(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "Unauthorized" });
    const { productId } = req.params;
    if (!productId) return res.status(400).json({ ok: false, error: "Missing productId" });
    await favoritesModel.removeFavorite(req.user.id, +productId);
    res.json({ ok: true, message: "Removed from favorites" });
  } catch (err) { next(err); }
}
