import { Router } from "express";
import Assessment from "../models/Assessment.js";
import mongoose from "mongoose";
import { validate } from "../lib/middlewares.js";
import {
  createActvityMessage,
  handleError,
  success,
  createActivity,
  parseBool,
  buildCiStartsWithRegex,
  toRegexTokens,
} from "../lib/utils.js";
import { ACTIONS } from "../lib/constants.js";
import Group from "../models/Group.js";

const router = Router();

// * Create assessment  (TEACHER, ADMIN-ONLY)

router.post("/create", validate(["teacher", "admin"]), async (req, res) => {
  try {
    const executer = req.user;
    const { percentage, assessment, term, subject, teacher, group, pending } =
      req.body;

    const newAssessment = await new Assessment({
      group: new mongoose.Types.ObjectId(group), // fixed key
      percentage,
      assessment: assessment.trim(),
      term,
      teacher: new mongoose.Types.ObjectId(teacher),
      subject: new mongoose.Types.ObjectId(subject),
      pending,
    }).save();

    createActivity(
      {
        userId: executer._id,
        role: executer.role,
        action: ACTIONS.assessment.createAssessment,
        description: createActvityMessage(
          executer.role,
          executer.firstName,
          `created an assessment with ID ${newAssessment._id}.`
        ),
        entity: "Assessment",
      },
      req
    );

    return success(res, newAssessment);
  } catch (error) {
    return handleError(res, error, "Failed creating an assessment");
  }
});

// * Modify assessment (TEACHER-ADMIN only)

router.patch(
  "/modify/:assessmentId",
  validate(["teacher", "admin"]),
  async (req, res) => {
    try {
      const executer = req.user;
      const { assessmentId } = req.params;

      const body = req.body;

      const updates = Object.fromEntries(
        Object.entries(body).filter(([_, value]) => value !== undefined)
      );

      const updated = await Assessment.findByIdAndUpdate(
        assessmentId,
        { $set: updates },
        { new: true }
      );

      createActivity(
        {
          userId: executer._id,
          role: executer.role,
          action: ACTIONS.assessment.modifyAssessment,
          description: createActvityMessage(
            executer.role,
            executer.firstName,
            `modified assessment ${updated._id}.`
          ),
          entity: "Assessment",
        },
        req
      );

      return success(res, updated);
    } catch (error) {
      return handleError(res, error, "Failed modifying assessment.");
    }
  }
);

//*  Delete one (TEACHER-ADMIN-only)

router.delete(
  "/one/:assessmentId",
  validate(["teacher", "admin"]),
  async (req, res) => {
    try {
      const executer = req.user;
      const { assessmentId } = req.params;

      const deleted = await Assessment.findByIdAndDelete(assessmentId);

      createActivity(
        {
          userId: executer._id,
          role: executer.role,
          action: ACTIONS.assessment.deleteAssessment,
          description: createActvityMessage(
            executer.role,
            executer.firstName,
            `deleted assessment ${deleted._id}.`
          ),
          entity: "Assessment",
        },
        req
      );

      return success(res, deleted);
    } catch (error) {
      return handleError(res, error, "Failed deleting assessment");
    }
  }
);

//* Get one assessment (ALL USERS)

router.get(
  "/one/:assessmentId",
  validate(["student", "teacher", "admin"]),
  async (req, res) => {
    try {
      const { _id: userId, role } = req.user;
      const { assessmentId } = req.params;

      if (!mongoose.isValidObjectId(assessmentId)) {
        return res.status(400).json({ message: "Invalid assessment id" });
      }

      const assessment = await Assessment.findById(assessmentId).populate([
        { path: "teacher" },
        { path: "subject" },
        {
          path: "group",
          populate: { path: "students" },
        },
      ]);

      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      const userIdStr = String(userId);

      if (role === "student") {
        const inGroup =
          Array.isArray(assessment.group?.students) &&
          assessment.group.students.some(
            (s) => String(s?._id ?? s) === userIdStr
          );

        if (!inGroup) {
          return res.status(403).json({
            message: "This action is forbidden with the current credentials",
          });
        }
      }

      if (role === "teacher") {
        const teacherId = assessment.teacher?._id ?? assessment.teacher; // handle doc or ObjectId
        const isOwner = teacherId && String(teacherId) === userIdStr;

        if (!isOwner) {
          return res.status(403).json({
            message: "This action is forbidden with the current credentials",
          });
        }
      }

      return success(res, assessment);
    } catch (error) {
      return handleError(res, error, "Failed getting the Assessment");
    }
  }
);

// * Get all assessments in a group (All users)

router.get(
  "/all/:groupId",
  validate(["teacher", "admin", "student"]),
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const { _id: userId, role } = req.user;

      if (!mongoose.isValidObjectId(groupId)) {
        return res.status(400).json({ message: "Invalid group id" });
      }

      if (role === "admin") {
        const assessments = await Assessment.find({ group: groupId })
          .populate([
            { path: "subject", select: "name" },
            { path: "group", select: "number" },
            { path: "teacher", select: "firstName lastName" },
          ])
          .lean();
        return success(res, assessments);
      }

      const uid = new mongoose.Types.ObjectId(String(userId));

      const accessFilter =
        role === "student"
          ? { _id: groupId, students: uid }
          : role === "teacher"
          ? { _id: groupId, teacher: uid }
          : { _id: null };

      const hasAccess = await Group.exists(accessFilter);
      if (!hasAccess) {
        return res.status(403).json({
          message: "This action is forbidden with the current credentials",
        });
      }

      const assessments = await Assessment.find({ group: groupId })
        .populate([
          { path: "subject", select: "name" },
          { path: "group", select: "number" },
          { path: "teacher", select: "firstName lastName" },
        ])
        .lean();

      return success(res, assessments);
    } catch (error) {
      return handleError(res, error, "Failed getting all assessments");
    }
  }
);

// * Get percentage for group progress

router.get(
  "/progress/:groupId",
  validate(["admin", "teacher", "student"]),
  async (req, res) => {
    try {
      const { groupId } = req.params;

      const percentages = await Assessment.find({ group: groupId }).select(
        "percentage"
      );
      const progress = percentages.reduce((acc, el) => acc + el.percentage, 0);

      return success(res, progress);
    } catch (error) {
      return handleError(res, error, "Failed getting group progress.");
    }
  }
);

//* Delete all assessments

router.delete("/all", validate(["admin"]), async (req, res) => {
  try {
    const executer = req.user;
    const deleted = await Assessment.deleteMany();

    createActivity(
      {
        userId: executer._id,
        role: executer.role,
        action: ACTIONS.assessment.deleteAllAssessments,
        description: createActvityMessage(
          executer.role,
          executer.firstName,
          `deleted all assessments.`
        ),
        entity: "Assessment",
      },
      req
    );

    return success(res, deleted);
  } catch (error) {
    return handleError(res, error, "Failed to delete assessments");
  }
});

//*   Recent/pending assessments for a teacher (TEACHER-ADMIN)

router.get(
  "/recent/teacher/:teacherId",
  validate(["teacher", "admin"]),
  async (req, res) => {
    try {
      const { teacherId } = req.params;

      const assessments = await Assessment.find({
        teacher: teacherId,
      })
        .populate([{ path: "group" }, { path: "subject" }, { path: "teacher" }])
        .lean();

      return success(res, assessments);
    } catch (error) {
      return handleError(res, error, "Failed getting assessments for teacher.");
    }
  }
);

// // * Get filtered assessments from teacher --> (TEACHER ONLY)

// router.get("/filtered/assessments", validate(["teacher"]), async (req, res) => {
//   try {
//     const teacherId = req.user._id;

//     const q = String(req.query.q ?? "").trim();
//     const groupId = req.query.groupId
//       ? String(req.query.groupNumber).trim()
//       : undefined;
//     const pending = parseBool(req.query.pending);
//     const term = req.query.term ? String(req.query.term).trim() : undefined;

//     const tokens = toRegexTokens(q);

//     const and = [{ teacher: teacherId }];

//     // If groupNumber provided, resolve matching group ids first
//     if (groupId) {
//       const re = buildCiStartsWithRegex(groupId);
//       const group = await Group.findById(re).lean();
//       if (!group) return success(res, []);
//       and.push({ group: group._id });
//     }

//     // tokenized free-text / numeric search
//     if (tokens.length) {
//       tokens.forEach((t) => {
//         const or = [{ assessment: buildCiStartsWithRegex(t) }];
//         const n = Number(t);
//         if (!Number.isNaN(n)) or.push({ percentage: n }); // numeric token hits percentage exactly
//         and.push({ $or: or });
//       });
//     }

//     if (pending !== undefined) and.push({ pending });
//     if (term) and.push({ term });

//     const filter = { $and: and };

//     const assessments = await Assessment.find(filter)
//       .sort({ createdAt: -1 })
//       .populate([
//         { path: "group", select: "number" },
//         { path: "subject", select: "name code" },
//       ])
//       .lean();

//     return success(res, assessments);
//   } catch (error) {
//     return handleError(res, error, "Failed getting assessments for teacher.");
//   }
// });

export default router;
