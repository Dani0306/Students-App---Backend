import { Router } from "express";
import { validate } from "../lib/middlewares.js";
import Activity from "../models/ActivityLog.js";
import { handleError, success } from "../lib/utils.js";

const router = Router();

// * Get recent activities --> (ADMIN ONLY)

router.get("/recent/actions", validate("admin"), async (_, res) => {
  try {
    let map = {
      Updates: 0,
      Creates: 0,
      Deletes: 0,
    };

    const recentActivies = await Activity.find().sort({ createdAt: -1 }).lean();

    const wordsMap = [
      {
        match: ["CREATE", "ADD"],
        keyword: "Creates",
      },
      {
        match: ["DELETE", "REMOVE", "CANCEL"],
        keyword: "Deletes",
      },
      {
        match: ["MODIFY", "CHANGE"],
        keyword: "Updates",
      },
    ];

    recentActivies.forEach((item) => {
      wordsMap.find(({ match, keyword }) =>
        match.some((word) => {
          if (item.action.includes(word)) {
            map[keyword]++;
          }
        })
      );
    });

    return success(res, {
      stats: { ...map, total: recentActivies.length },
      activities: recentActivies.slice(0, 50),
    });
  } catch (error) {
    return handleError(res, error, "Failed getting recent activity.");
  }
});

// * Get one activity

router.get("/one/:activityId", validate(["admin"]), async (req, res) => {
  try {
    const { activityId } = req.params;
    const activity = await Activity.findById(activityId).populate("userId");
    return success(res, activity);
  } catch (error) {
    return handleError(res, error, "Failed getting activity");
  }
});

// * Get recent acitivies from user

router.get("/all/:userId", validate(["admin"]), async (req, res) => {
  try {
    const { userId } = req.params;
    const acitiviy = await Activity.find({ userId });

    return success(res, acitiviy);
  } catch (error) {
    return handleError(res, error, "Failed getting activity from user.");
  }
});

// * get recent activies with pagination and filter

// GET /activity/filtered/activities?q=&page=&limit=&from=&to=
router.get("/filtered/activities", validate(["admin"]), async (req, res) => {
  try {
    const qRaw = String(req.query.q ?? "").trim();
    const page = Math.max(parseInt(String(req.query.page ?? 1), 10) || 1, 1);
    const limit = Math.min(
      parseInt(String(req.query.limit ?? 50), 10) || 50,
      100
    );

    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    if (to && !isNaN(+to)) to.setHours(23, 59, 59, 999); // include end day

    // Build initial $match (date range etc.)
    const preMatch = {};
    if (from && !isNaN(+from))
      preMatch.createdAt = { ...(preMatch.createdAt || {}), $gte: from };
    if (to && !isNaN(+to))
      preMatch.createdAt = { ...(preMatch.createdAt || {}), $lte: to };

    // Tokenize search (case-insensitive, partial)
    const tokens = qRaw
      ? qRaw
          .split(/\s+/)
          .filter(Boolean)
          .map((t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"))
      : [];

    // Build the OR fields per token for both Activity and joined User
    const orFieldsForToken = (rx) => [
      // Activity fields
      { description: rx },
      { action: rx },
      { device: rx },
      { browser: rx },
      { entity: rx },
      { role: rx },
      { ip: rx },
      // Joined user fields
      { "user.firstName": rx },
      { "user.lastName": rx },
      { "user.email": rx },
      { "user.id": rx },
    ];

    const pipeline = [
      // 1) Pre-filter (date range etc.)
      Object.keys(preMatch).length ? { $match: preMatch } : null,

      // 2) Join user
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: { firstName: 1, lastName: 1, email: 1, id: 1, role: 1 },
            },
          ],
        },
      },
      { $addFields: { user: { $first: "$user" } } },

      // 3) Text match across activity + user
      tokens.length
        ? {
            $match: {
              $and: tokens.map((rx) => ({ $or: orFieldsForToken(rx) })),
            },
          }
        : null,

      // 4) Sort newest first
      { $sort: { createdAt: -1 } },

      // 5) Paginate + total count in one pass
      {
        $facet: {
          results: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          total: [{ $count: "value" }],
        },
      },
      {
        $addFields: {
          total: { $ifNull: [{ $arrayElemAt: ["$total.value", 0] }, 0] },
        },
      },
    ].filter(Boolean);

    const agg = await Activity.aggregate(pipeline);
    const { results = [], total = 0 } = agg[0] || {};

    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const hasMore = page * limit < total;

    return res.status(200).json({
      results,
      pagination: {
        currentPage: page,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    return handleError(res, error, "Failed filtering activities.");
  }
});

export default router;
