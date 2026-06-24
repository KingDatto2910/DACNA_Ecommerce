import * as promotionModel from "../models/promotionModel.js";

/**
 * [GET] /api/promotions/admin
 * List all promotions (admin only)
 */
export async function listPromotions(req, res, next) {
  try {
    const { page, limit, is_active, search, sort_by, sort_dir } = req.query;
    
    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
      search,
      sort_by,
      sort_dir,
    };

    const result = await promotionModel.list(options);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

/**
 * [GET] /api/promotions/admin/:id
 * Get promotion details (admin only)
 */
export async function getPromotionById(req, res, next) {
  try {
    const { id } = req.params;
    const promotion = await promotionModel.getById(id);

    if (!promotion) {
      return res.status(404).json({ ok: false, message: "Promotion not found" });
    }

    res.json({ ok: true, data: promotion });
  } catch (err) {
    next(err);
  }
}

/**
 * [POST] /api/promotions/admin
 * Create a new promotion (admin only)
 */
export async function createPromotion(req, res, next) {
  try {
    const {
      code,
      description,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      usage_limit,
      per_user_limit,
      start_date,
      end_date,
      is_active,
    } = req.body;

    // Validation
    if (!code || !discount_type || !discount_value || !start_date || !end_date) {
      return res.status(400).json({
        ok: false,
        message: "Missing required fields: code, discount_type, discount_value, start_date, end_date",
      });
    }

    if (!['percentage', 'fixed'].includes(discount_type)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid discount_type. Must be 'percentage' or 'fixed'",
      });
    }

    if (discount_value <= 0) {
      return res.status(400).json({
        ok: false,
        message: "discount_value must be greater than 0",
      });
    }

    if (discount_type === 'percentage' && discount_value > 100) {
      return res.status(400).json({
        ok: false,
        message: "Percentage discount cannot exceed 100%",
      });
    }

    const promotionId = await promotionModel.create({
      code,
      description,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      usage_limit,
      per_user_limit,
      start_date,
      end_date,
      is_active,
    });

    res.status(201).json({
      ok: true,
      message: "Promotion created successfully",
      data: { promotionId },
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        ok: false,
        message: "Promotion code already exists",
      });
    }
    next(err);
  }
}

/**
 * [PATCH] /api/promotions/admin/:id
 * Update a promotion (admin only)
 */
export async function updatePromotion(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const success = await promotionModel.update(id, updateData);

    if (!success) {
      return res.status(404).json({ ok: false, message: "Promotion not found" });
    }

    res.json({ ok: true, message: "Promotion updated successfully" });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        ok: false,
        message: "Promotion code already exists",
      });
    }
    next(err);
  }
}

/**
 * [DELETE] /api/promotions/admin/:id
 * Delete a promotion (admin only)
 */
export async function deletePromotion(req, res, next) {
  try {
    const { id } = req.params;
    const success = await promotionModel.deletePromotion(id);

    if (!success) {
      return res.status(404).json({ ok: false, message: "Promotion not found" });
    }

    res.json({ ok: true, message: "Promotion deleted successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * [POST] /api/promotions/validate
 * Validate a promotion code for the current user/order
 */
export async function validatePromotion(req, res, next) {
  try {
    const { code, order_amount } = req.body;
    const userId = req.user?.id || null;

    if (!code || !order_amount) {
      return res.status(400).json({
        ok: false,
        message: "Missing required fields: code, order_amount",
      });
    }

    const result = await promotionModel.validatePromotion(
      code,
      userId,
      parseFloat(order_amount)
    );

    if (!result.valid) {
      return res.status(400).json({
        ok: false,
        message: result.message,
      });
    }

    res.json({
      ok: true,
      data: {
        promotion_id: result.promotion.id,
        code: result.promotion.code,
        discount_amount: result.discountAmount,
        description: result.promotion.description,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * [GET] /api/promotions/my-usage
 * Get current user's promotion usage history
 */
export async function getMyUsage(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const { page, limit } = req.query;
    const result = await promotionModel.getUserUsage(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20
    );

    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}
