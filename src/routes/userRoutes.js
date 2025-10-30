import { Router } from "express";
import User from "../models/user.js";
import { validate } from "../lib/middlewares.js";
import {
  createActivity,
  createActvityMessage,
  escapeRegex,
  handleError,
  parseBool,
  success,
  toObjectId,
  toRegexTokens,
} from "../lib/utils.js";
import { genSalt, hash } from "bcrypt";
import Subject from "../models/Subject.js";
import Group from "../models/Group.js";
import { ACTIONS } from "../lib/constants.js";

const router = Router();

// * Get all students --> (ADMIN-ONLY)

router.get("/all/students", validate(["admin"]), async (_, res) => {
  try {
    const students = await User.find({ role: "student" });
    return success(res, students);
  } catch (error) {
    return handleError(res, error, "Failed getting students");
  }
});

// * Get current user --> (ALL USERS)

router.get(
  "/one/:userId",
  validate(["student", "teacher", "admin"]),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId).populate("blockedBy").lean();
      return success(res, user);
    } catch (error) {
      return handleError(res, error, "Failed getting current user.");
    }
  }
);

// * Create a user --> (ADMIN-ONLY)

router.post("/create", validate(["admin"]), async (req, res) => {
  try {
    const executer = req.user;
    const { firstName, lastName, email, id, documentType, role } = req.body;

    const newUser = await new User({
      firstName,
      lastName,
      email,
      id,
      password: id,
      documentType,
      role,
      needToChange: true,
    }).save();

    createActivity(
      {
        userId: executer._id,
        role: executer.role,
        action: ACTIONS.user.createUser,
        description: createActvityMessage(
          executer.role,
          executer.firstName,
          `created user with role ${newUser.role} and ID ${newUser.id}.`
        ),
        entity: "Users",
      },
      req
    );

    return success(res, newUser);
  } catch (error) {
    return handleError(res, error, "Error creating User");
  }
});

// * Get all users --> (ADMIN-ONLY)

router.get("/all", validate(["admin"]), async (_, res) => {
  try {
    const users = await User.find();
    return success(res, users);
  } catch (error) {
    return handleError(res, error, "Failed to get users");
  }
});

// Delete all users --> (ADMIN-ONLY)
router.delete("/all", validate(["admin"]), async (req, res) => {
  try {
    const deleted = await User.deleteMany();
    return success(res, deleted);
  } catch (error) {
    return handleError(res, error, "Failed to delete users");
  }
});

// * Customize password --> (ALL USERS)

router.patch(
  "/modify/password/:userId",
  validate(["student", "teacher", "admin"]),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { password, currentPassword } = req.body;

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.password === password) {
        return res
          .status(400)
          .json({ message: "The password must be different" });
      }

      if (currentPassword !== user.password)
        return res
          .status(400)
          .json({ message: "Your current password is incorrect." });

      const salt = await genSalt(10);
      const hashed = await hash(password, salt);

      await User.findByIdAndUpdate(
        userId,
        { password: hashed, needToChange: false },
        { new: true }
      );

      createActivity(
        {
          userId: user._id,
          role: user.role,
          action: ACTIONS.user.changePassword,
          description: createActvityMessage(
            user.role,
            user.firstName,
            `processed a successful password change.`
          ),
          entity: "Users",
        },
        req
      );

      return success(res, { message: "Password successfully changed." });
    } catch (error) {
      return handleError(res, error, "Failed to change password");
    }
  }
);

// * Update or modify user information --> (ALL USERS)

router.patch(
  "/modify/information/:userId",
  validate(["student", "teacher", "admin"]),
  async (req, res) => {
    try {
      const body = req.body;
      const { userId } = req.params;

      const updates = Object.fromEntries(
        Object.entries(body).filter(([_, value]) => value !== undefined)
      );

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: updates,
        },
        { new: true }
      );

      createActivity(
        {
          userId: user._id,
          role: user.role,
          action: ACTIONS.user.modifyProfile,
          description: createActvityMessage(
            user.role,
            user.firstName,
            "modified his profile."
          ),
          entity: "Users",
        },
        req
      );

      return success(res, user);
    } catch (error) {
      return handleError(res, error, "Failed modifying user");
    }
  }
);

// * Get all ADMIN stats for dashboard --> (ADMIN-ONLY)

router.get("/admin/stats/:term", validate(["admin"]), async (req, res) => {
  try {
    const { term } = req.params;
    const [
      activeStudents,
      activeTeachers,
      activeSubjects,
      activeCourses,
      lockedSubjects,
    ] = await Promise.all([
      User.countDocuments({ role: "student", active: true }),
      User.countDocuments({ role: "teacher", active: true }),
      Subject.countDocuments({ term, active: true }),
      Group.countDocuments({ term }),
      Subject.countDocuments({ term, active: false }),
    ]);

    return success(res, {
      snapShot: new Date().toISOString(),
      activeStudents,
      activeTeachers,
      activeSubjects,
      activeCourses,
      lockedSubjects,
    });
  } catch (error) {
    return handleError(res, error, "Failed getting dashboard stats.");
  }
});

// * Change user role --> (ADMIN-ONLY)

router.patch("/changeRole/:userId", validate(["admin"]), async (req, res) => {
  try {
    const executer = req.user;
    const { userId } = req.params;
    const { role } = req.body;

    const newUser = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );

    createActivity(
      {
        userId: executer._id,
        role: executer.role,
        action: ACTIONS.user.changeRole,
        description: createActvityMessage(
          executer.role,
          executer.firstName,
          `processed a successful role change to user with ID ${newUser.id}.`
        ),
        entity: "Users",
      },
      req
    );

    return success(res, "Role updated successfully!");
  } catch (error) {
    return handleError(res, error, "Failed changing role");
  }
});

// * Fetch users by query

router.get("/get/users", validate(["admin"]), async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const limit = Math.min(Number(req.query.limit ?? 12), 50);

    if (!q) {
      const defaultUsers = await User.find()
        .sort({ firstName: 1, lastName: 1 })
        .limit(limit);
      return success(res, defaultUsers);
    }

    const tokens = q
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => new RegExp(escapeRegex(t), "i"));

    const filter = {
      $and: tokens.map((rx) => ({
        $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { id: rx }],
      })),
    };

    const results = await User.find(filter)
      .collation({ locale: "en", strength: 2 })
      .sort({ lastName: 1, firstName: 1 })
      .limit(limit)
      .lean();

    return success(res, results);
  } catch (error) {
    return handleError(res, error, "Search failed");
  }
});

// * Block a user --> (ADMIN-ONLY)

router.patch("/block/:userId", validate(["admin"]), async (req, res) => {
  try {
    const executer = req.user;
    const { userId } = req.params;
    const updated = await User.findByIdAndUpdate(
      userId,
      {
        status: "blocked",
        blockedBy: executer._id,
        blockedAt: new Date(),
      },
      {
        new: true,
      }
    );

    createActivity(
      {
        userId: executer._id,
        role: executer.role,
        action: ACTIONS.user.blockUser,
        description: createActvityMessage(
          executer.role,
          executer.firstName,
          `Blocked ${updated.role} ${updated.firstName} ${updated.lastName}.`
        ),
        entity: "Users",
      },
      req
    );

    return success(res, updated);
  } catch (error) {
    return handleError(res, error, "Failed blocking user.");
  }
});

// * Unblock a user

router.patch("/unblock/:userId", validate(["admin"]), async (req, res) => {
  try {
    const executer = req.user;
    const { userId } = req.params;
    const updated = await User.findByIdAndUpdate(
      userId,
      {
        status: "active",
        blockedBy: null,
        blockedAt: null,
      },
      {
        new: true,
      }
    );

    createActivity(
      {
        userId: executer._id,
        role: executer.role,
        action: ACTIONS.user.unblockUser,
        description: createActvityMessage(
          executer.role,
          executer.firstName,
          `Unblocked ${updated.role} ${updated.firstName} ${updated.lastName}.`
        ),
        entity: "Users",
      },
      req
    );

    return success(res, updated);
  } catch (error) {
    return handleError(res, error, "Failed blocking user.");
  }
});

// * Get users by query new

// GET /user/get/users/all
router.get("/get/users/all", validate(["admin"]), async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const limit = Math.min(Number(req.query.limit ?? 12), 50);
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const status = req.query.status;

    const role = req.query.role;
    const needToChange = parseBool(req.query.needToChange);
    const active = parseBool(req.query.active);

    const tokens = toRegexTokens(q);

    const and = [];

    if (tokens.length) {
      and.push({
        $and: tokens.map((rx) => ({
          $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { id: rx }],
        })),
      });
    }

    if (role) and.push({ role });
    if (needToChange !== undefined) and.push({ needToChange });
    if (active !== undefined) and.push({ active });
    if (status !== undefined) and.push({ status });

    const filter = and.length ? { $and: and } : {};

    // count for hasNextPage
    const totalCount = await User.countDocuments(filter);

    const results = await User.find(filter)
      .collation({ locale: "en", strength: 2 })
      .sort({ firstName: 1, lastName: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const hasNextPage = page * limit < totalCount;
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      results,
      pagination: {
        currentPage: page,
        totalPages,
        hasMore: hasNextPage,
      },
    });
  } catch (error) {
    return handleError(res, error, "Search failed");
  }
});

export default router;
