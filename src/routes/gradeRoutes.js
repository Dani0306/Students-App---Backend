import Grade from "../models/Grade.js";
import { validate } from "../lib/middlewares.js";
import { Router } from "express";
import {
  createActvityMessage,
  createActivity,
  handleError,
  success,
} from "../lib/utils.js";
import { ACTIONS } from "../lib/constants.js";
import mongoose from "mongoose";

const router = Router();

// * Create a grade --> (ADMIN-TEACHER-only)

router.post("/create", validate(["admin", "teacher"]), async (req, res) => {
  try {
    const executer = req.user;
    const { assessment, grade, term, subject, student, group, teacher } =
      req.body;

    const exists = await Grade.find({ assessment, student });

    if (exists.length > 0)
      return res.status(400).json({
        message: "This student already has a grade for this assessment.",
      });

    const newGrade = await new Grade({
      grade,
      term,
      student: new mongoose.Types.ObjectId(student),
      subject: new mongoose.Types.ObjectId(subject),
      group: new mongoose.Types.ObjectId(group),
      assessment: new mongoose.Types.ObjectId(assessment),
      teacher: new mongoose.Types.ObjectId(teacher),
    }).save();

    createActivity(
      {
        userId: executer._id,
        role: executer.role,
        action: ACTIONS.grade.createGrade,
        description: createActvityMessage(
          executer.role,
          executer.firstName,
          `created a grade with ID: ${newGrade._id}.`
        ),
        entity: "Grade",
      },
      req
    );

    return success(res, newGrade);
  } catch (error) {
    return handleError(res, error, "Failed creating grade");
  }
});

// * Modify one grade --> (ADMIN-TEACHER only)

router.patch(
  "/modify/:gradeId",
  validate(["teacher", "admin"]),
  async (req, res) => {
    try {
      const executer = req.user;
      const { gradeId } = req.params;
      const { grade } = req.body;

      const modified = await Grade.findByIdAndUpdate(
        gradeId,
        { grade },
        { new: true }
      );

      createActivity(
        {
          userId: executer._id,
          role: executer.role,
          action: ACTIONS.grade.modifyGrade,
          description: createActvityMessage(
            executer.role,
            executer.firstName,
            `modified a grade with ID: ${modified._id}.`
          ),
          entity: "Grade",
        },
        req
      );

      return success(res, "Grade modified successfully!");
    } catch (error) {
      return handleError(res, error, "Failed modifying grade");
    }
  }
);

// * Remove one grade --> (ADMIN-TEACHER only)

router.delete(
  "/one/:gradeId",
  validate(["admin", "teacher"]),
  async (req, res) => {
    try {
      const { gradeId } = req.params;

      const deleted = await Grade.findByIdAndDelete(gradeId);

      const executer = req.user;

      createActivity(
        {
          userId: executer._id,
          role: executer.role,
          action: ACTIONS.grade.deleteGrade,
          description: createActvityMessage(
            executer.role,
            executer.firstName,
            `deleted a grade with ID: ${deleted._id}.`
          ),
          entity: "Grade",
        },
        req
      );

      return success(res, deleted);
    } catch (error) {
      return handleError(res, error, "Failed deleting grade");
    }
  }
);

// * Get Grades from a student --> (STUDENT-ADMIN only)

router.get(
  "/allGrades/:studentId",
  validate(["student", "admin"]),
  async (req, res) => {
    try {
      const { limit } = req.query;

      const { studentId } = req.params;

      const grades = await Grade.find({
        student: studentId,
      })
        .populate([
          { path: "teacher", select: "firstName lastName" },
          { path: "student", select: "firstName lastName" },
          { path: "subject", select: "name code term" },
          { path: "assessment", select: "assessment percentage" },
        ])
        .lean()
        .limit(limit);

      return success(res, grades);
    } catch (error) {
      return handleError(res, error, "Failed getting all grades from student");
    }
  }
);

// * Remove all grades --> (ADMIN-only)

router.delete("/all", validate(["admin"]), async (req, res) => {
  try {
    const executer = req.user;

    await Grade.deleteMany();

    createActivity(
      {
        userId: executer._id,
        role: executer.role,
        action: ACTIONS.grade.deleteGrade,
        description: createActvityMessage(
          executer.role,
          executer.firstName,
          `deleted all grades.`
        ),
        entity: "Grade",
      },
      req
    );

    return success(res, "All grades deleted successfully");
  } catch (error) {
    return handleError(res, error, "Failed deleting all grades.");
  }
});

// * Get all recent grades made by a teacher --> (TEACHER ONLY)

router.get(
  "/recent/teacher/:teacherId",
  validate(["teacher", "admin"]),
  async (req, res) => {
    try {
      const { teacherId } = req.params;

      const grades = await Grade.find({ teacher: teacherId })
        .limit(25)
        .sort({ createdAt: -1 })
        .populate([
          { path: "student" },
          { path: "assessment" },
          { path: "group" },
          { path: "subject" },
        ])
        .lean();

      return success(res, grades);
    } catch (error) {
      return handleError(res, error, "Failed getting grades.");
    }
  }
);

// * Get all grades belonging to an assessment

router.get(
  "/all/assessment/:assessmentId",
  validate(["teacher", "admin", "student"]),
  async (req, res) => {
    try {
      const { assessmentId } = req.params;
      const { _id: userId, role } = req.user;

      const filters =
        role === "student"
          ? { assessment: assessmentId, student: userId }
          : { assessment: assessmentId };

      const grades = await Grade.find(filters)
        .populate([
          { path: "teacher", select: "firstName lastName" },
          { path: "student", select: "firstName lastName id" },
          { path: "subject", select: "name code term" },
          { path: "assessment", select: "assessment percentage" },
          { path: "group", select: "number" },
        ])
        .lean();

      return success(res, grades);
    } catch (error) {
      return handleError(res, error, "Failed getting grades from assessment.");
    }
  }
);

export default router;
