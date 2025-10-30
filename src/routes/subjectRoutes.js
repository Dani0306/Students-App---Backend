import { Router } from "express";
import Subject from "../models/Subject.js";
import { validate } from "../lib/middlewares.js";
import {
  createActivity,
  createActvityMessage,
  generateSubjectCode,
  handleError,
  success,
  escapeRegex,
} from "../lib/utils.js";
import Group from "../models/Group.js";
import { ACTIONS } from "../lib/constants.js";
import User from "../models/user.js";
import Assessment from "../models/Assessment.js";

const router = Router();

// * Get one subject --> (ALL USERS)

router.get(
  "/one/:subjectId",
  validate(["student", "admin", "teacher"]),
  async (req, res) => {
    try {
      const role = req.user.role;
      const { subjectId } = req.params;

      const fields =
        role !== "admin"
          ? "code name credits active term description createdAt updatedAt"
          : "code name credits active term groups description createdAt updatedAt";

      const subject = await Subject.findById(subjectId)
        .select(fields)
        .populate({
          path: "groups",
          populate: [{ path: "teacher", select: "firstName lastName" }],
        })
        .lean();

      return success(res, subject);
    } catch (error) {
      return handleError(res, error, "Failed getting subject");
    }
  }
);

// * Create subject --> (ADMIN-ONLY)

router.post("/create", validate(["admin"]), async (req, res) => {
  try {
    const executer = req.user;
    const { name, credits, groups, term } = req.body;

    const code = generateSubjectCode();
    const exists = Subject.findOne({ code });

    const newSubject = await new Subject({
      code: exists ? generateSubjectCode() : code,
      name,
      credits,
      groups,
      term,
    }).save();

    createActivity(
      {
        userId: executer._id,
        role: executer.role,
        action: ACTIONS.subject.createSubject,
        description: createActvityMessage(
          executer.role,
          executer.firstName,
          `created a subject ${newSubject.name}.`
        ),
        entity: "Subject",
      },
      req
    );

    return success(res, newSubject);
  } catch (error) {
    return handleError(res, error, "Failed creating Subject");
  }
});

// * Get all subjects -> (ADMIN-ONLY)

router.get("/all", validate(["admin"]), async (_, res) => {
  try {
    const subjects = await Subject.find().lean();

    return success(res, subjects);
  } catch (error) {
    return handleError(res, error, "Failed getting subjects");
  }
});

// * Delete all subjects --> (ADMIN-ONLY)

router.delete("/all", validate(["admin"]), async (req, res) => {
  try {
    const executer = req.user;
    const subjects = await Subject.deleteMany();

    createActivity(
      {
        userId: executer._id,
        role: executer.role,
        action: ACTIONS.subject.deleteAllSubjects,
        description: createActvityMessage(
          executer.role,
          executer.firstName,
          `deleted all subjects.`
        ),
        entity: "Subject",
      },
      req
    );

    return success(res, subjects);
  } catch (error) {
    return handleError(res, error, "Failed deleting subjects");
  }
});

// * Delete one subject --> (ADMIN-ONLY)

router.delete("/one/:subjectId", validate(["admin"]), async (req, res) => {
  try {
    const executer = req.user;
    const { subjectId } = req.params;

    const deleted = await Subject.findByIdAndDelete(subjectId);

    createActivity(
      {
        userId: executer._id,
        role: executer.role,
        action: ACTIONS.subject.deleteOneSubject,
        description: createActvityMessage(
          executer.role,
          executer.firstName,
          `deleted a subject with ID ${deleted._id}.`
        ),
        entity: "Subject",
      },
      req
    );

    return success(res, deleted);
  } catch (error) {
    return handleError(res, error, "Failed removing subjects");
  }
});

// * Modify one subject --> (ADMIN ONLY)

router.patch(
  "/modify/information/:subjectId",
  validate(["admin"]),
  async (req, res) => {
    try {
      const executer = req.user;
      const { subjectId } = req.params;
      const body = req.body;

      const updates = Object.fromEntries(
        Object.entries(body).filter(([, v]) => v !== undefined)
      );

      const updated = await Subject.findByIdAndUpdate(
        subjectId,
        { $set: updates },
        { new: true }
      );

      createActivity(
        {
          userId: executer._id,
          role: executer.role,
          action: ACTIONS.subject.modifySubject,
          description: createActvityMessage(
            executer.role,
            executer.firstName,
            `modified subject with ID: ${updated._id}.`
          ),
          entity: "Subject",
        },
        req
      );

      return success(res, updated);
    } catch (error) {
      return handleError(res, error, "Failed modifying subject");
    }
  }
);

// * Get all subjects the user belongs to --> (ALL USERS)

router.get(
  "/userSubjects/:userId",
  validate(["student", "admin", "teacher"]),
  async (req, res) => {
    try {
      const { userId } = req.params;

      const groups = await Group.find({
        students: { $in: [userId] },
      })
        .select("number term schedule classRoom")
        .populate({
          path: "subject",
          select: "code name credits term",
        })
        .lean();

      return success(res, groups);
    } catch (error) {
      return handleError(res, error, "Failed getting subjects");
    }
  }
);

// * get all IDS

router.get("/all/ids", async (_, res) => {
  const subjectIds = await Subject.distinct("_id");
  const teacherId = await User.findOne({
    firstName: "Daniel",
    role: "teacher",
  }).distinct("_id");
  const students = await User.find({ role: "student" }).distinct("_id");
  const groupsId = await Group.distinct("_id");
  const assessments = await Assessment.distinct("_id");

  const data = { subjectIds, teacherId, groupsId, students, assessments };

  return success(res, data);
});

// * Get subjects with filters

router.get("/get/subjects", validate("admin"), async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const limit = Number(req.query.limit) || 12;

    const tokens = q
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => new RegExp(escapeRegex(t), "i"));

    const filter = {
      $and: tokens.map((rx) => ({
        $or: [{ name: rx }, { code: rx }],
      })),
    };

    const subjects = await Subject.find(filter)
      .collation({ locale: "en", strength: 2 })
      .sort({ name: 1, code: 1 })
      .limit(limit)
      .lean();

    return success(res, subjects);
  } catch (error) {
    return handleError(res, error, "Failed fetching subjects by query.");
  }
});

export default router;
