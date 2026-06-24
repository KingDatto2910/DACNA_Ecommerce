import * as reviewModel from "../models/reviewModel.js";

/**
 * [GET] /api/reviews/admin
 * List all reviews with filters (admin only)
 */
export async function listAllReviews(req, res, next) {
  try {
    const result = await reviewModel.listAllReviews(req.query);

    res.json({
      ok: true,
      data: result.rows,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * [DELETE] /api/reviews/admin/:id
 * Delete a review (admin only)
 */
export async function deleteReviewByAdmin(req, res, next) {
  try {
    const { id } = req.params;

    // Check if review exists
    const review = await reviewModel.getReviewById(id);
    if (!review) {
      return res.status(404).json({ ok: false, message: "Review not found" });
    }

    const productId = review.product_id;

    // Delete review
    await reviewModel.deleteReview(id);

    // Update product rating stats
    await reviewModel.updateProductRatingStats(productId);

    res.json({ ok: true, message: "Review deleted successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * [PATCH] /api/reviews/admin/:id/reply
 * Add or update admin reply to a review (admin/staff only)
 */
export async function updateReviewReply(req, res, next) {
  try {
    const { id } = req.params;
    const { admin_reply } = req.body;

    if (!admin_reply || !admin_reply.trim()) {
      return res
        .status(400)
        .json({ ok: false, message: "Reply text is required" });
    }

    // Check if review exists
    const reviewExists = await reviewModel.reviewExists(id);
    if (!reviewExists) {
      return res.status(404).json({ ok: false, message: "Review not found" });
    }

    // Update admin reply
    await reviewModel.updateReviewReply(id, admin_reply);

    res.json({ ok: true, message: "Reply saved successfully" });
  } catch (err) {
    next(err);
  }
}
