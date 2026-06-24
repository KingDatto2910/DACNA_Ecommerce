import { getDailyAnalytics as getDailyAnalyticsModel } from "../models/analyticsModel.js";

/**
 * Get daily analytics for a specific date
 * Query params: date (YYYY-MM-DD)
 */
export async function getDailyAnalytics(req, res, next) {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid date format. Please use YYYY-MM-DD",
      });
    }

    const data = await getDailyAnalyticsModel(date);
    res.json({ ok: true, data });
  } catch (err) {
    console.error("Analytics error:", err);
    next(err);
  }
}
