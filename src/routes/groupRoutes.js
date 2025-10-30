import { Router } from "express";
import Group from "../models/Group.js";
import { validate } from "../lib/middlewares.js";
import Subject from "../models/Subject.js";
import {
  success,
  handleError,
  createActvityMessage,
  createActivity,
} from "../lib/utils.js";
import { ACTIONS } from "../lib/constants.js";

const router = Router();

/* -------------------------------------------------------------------------- */
//                      * Create a new group → (ADMIN ONLY)
/* -------------------------------------------------------------------------- */

router.post("/create", validate(["admin"]), async (req, res) => {
  try {
    const executer = req.user;
    const { number, subject, term, classRoom, schedule, teacher } = req.body;

    const newGroup = await new Group({
      number,
      subject,
      term,
      classRoom,
      schedule,
      teacher,
    }).save();

    await Subject.findByIdAndUpdate(
      subject,
      { $push: { groups: newGroup._id } },
      { new: true }
    );

    createActivity(
      {
        userId: executer._id,
        role: executer.role,
        action: ACTIONS.group.createGroup,
        description: createActvityMessage(
          executer.role,
          executer.firstName,
          `created a group with ID: ${newGroup.number}.`
        ),
        entity: "Group",
      },
      req
    );

    return success(res, newGroup);
  } catch (error) {
    return handleError(res, error, "Failed creating group");
  }
});

/* -------------------------------------------------------------------------- */
// *                            Get one group (ALL PROFILES)                          */
/* -------------------------------------------------------------------------- */

router.get(
  "/one/:groupId",
  validate(["student", "teacher", "admin"]),
  async (req, res) => {
    try {
      const { groupId } = req.params;

      const group = await Group.findById(groupId)
        .populate([
          { path: "students" },
          { path: "teacher" },
          { path: "subject" },
        ])
        .lean();

      return success(res, group);
    } catch (error) {
      return handleError(res, error, "Failed getting group.");
    }
  }
);

/* -------------------------------------------------------------------------- */
// *                            Get all groups (ADMIN)                          */
/* -------------------------------------------------------------------------- */

router.get("/all", validate(["admin"]), async (_, res) => {
  try {
    const groups = await Group.find();
    return success(res, groups);
  } catch (error) {
    return handleError(res, error, "Failed getting groups");
  }
});

/* -------------------------------------------------------------------------- */
// *                          Delete all groups (ADMIN)                         */
/* -------------------------------------------------------------------------- */

router.delete("/all", validate(["admin"]), async (req, res) => {
  try {
    const executer = req.user;
    const groups = await Group.deleteMany();

    createActivity(
      {
        userId: executer._id,
        role: executer.role,
        action: ACTIONS.group.deleteAllGroups,
        description: createActvityMessage(
          executer.role,
          executer.firstName,
          `deleted all groups.`
        ),
        entity: "Group",
      },
      req
    );

    return success(res, groups);
  } catch (error) {
    return handleError(res, error, "Failed deleting groups");
  }
});

/* -------------------------------------------------------------------------- */
// *                  Remove students from group (ADMIN ONLY)                  */
/* -------------------------------------------------------------------------- */

router.post(
  "/remove/students/:groupId",
  validate(["admin"]),
  async (req, res) => {
    try {
      const executer = req.user;
      const { students } = req.body;

      const { groupId } = req.params;

      const group = await Group.findByIdAndUpdate(groupId, {
        $pull: { students: { $in: students } },
      });

      createActivity(
        {
          userId: executer._id,
          role: executer.role,
          action: ACTIONS.group.removeUser,
          description: createActvityMessage(
            executer.role,
            executer.firstName,
            `removed ${students.length > 1 ? "users" : "user"} ${students.join(
              " and "
            )} from group ${group.number}.`
          ),
          entity: "Group",
        },
        req
      );

      return success(res, group);
    } catch (error) {
      return handleError(res, error, "Failed removing student from group");
    }
  }
);

/* -------------------------------------------------------------------------- */
// *                     Add students to group (ADMIN ONLY)                    */
/* -------------------------------------------------------------------------- */

router.post("/add/students/:groupId", validate(["admin"]), async (req, res) => {
  try {
    const executer = req.user;
    const { groupId } = req.params;
    const { students } = req.body;

    const group = await Group.findByIdAndUpdate(groupId, {
      $addToSet: { students: { $each: students } },
    });

    createActivity(
      {
        userId: executer._id,
        role: executer.role,
        action: ACTIONS.group.addUser,
        description: createActvityMessage(
          executer.role,
          executer.firstName,
          `added ${students.length > 1 ? "users" : "user"} ${students.join(
            " "
          )} to group ${group.number}.`
        ),
        entity: "Group",
      },
      req
    );

    return success(res, group);
  } catch (error) {
    return handleError(res, error, "Failed adding student to group");
  }
});

/* -------------------------------------------------------------------------- */
// *                Get all groups from a subject (ADMIN ONLY)                  */
/* -------------------------------------------------------------------------- */

router.get("/all/:subjectId", validate(["admin"]), async (req, res) => {
  try {
    const { subjectId } = req.params;
    const groups = await Subject.findById(subjectId)
      .select("groups")
      .populate("groups");
    return success(res, groups);
  } catch (error) {
    return handleError(res, error, "Failed getting groups from subject.");
  }
});

/* -------------------------------------------------------------------------- */
// *             Get all groups that a student belongs to       */
/* -------------------------------------------------------------------------- */

router.get(
  "/all/user/:userId",
  validate(["student", "admin", "teacher"]),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.user;

      if (role === "teacher") {
        const groups = await Group.find({ teacher: userId })
          .populate([
            { path: "students" },
            { path: "subject" },
            { path: "teacher", select: "firstName lastName" },
          ])
          .lean();

        return success(res, groups);
      }

      if (role === "student") {
        const groups = await Group.find({ students: userId })
          .populate([
            { path: "subject" },
            { path: "teacher", select: "firstName lastName" },
          ])
          .lean();

        return success(res, groups);
      }

      return res.status(404).json({ message: "No role specified" });
    } catch (error) {
      return handleError(res, error, "Failed getting student courses.");
    }
  }
);

/* -------------------------------------------------------------------------- */
// *             User Cancel subject --> (STUDENT ONLY)          */
/* -------------------------------------------------------------------------- */

router.post(
  "/cancel/:studentId/:groupId",
  validate(["student", "admin"]),
  async (req, res) => {
    try {
      const executer = req.user;

      const { studentId, groupId } = req.params;
      const updated = await Group.findByIdAndUpdate(groupId, {
        $pull: { students: studentId },
      }).populate([{ path: "subject", select: "name" }]);

      createActivity(
        {
          userId: executer._id,
          role: executer.role,
          action: ACTIONS.subject.cancelSubject,
          description: createActvityMessage(
            executer.role,
            executer.firstName,
            `Cancelled subject ${updated.subject.name}`
          ),
          entity: "Group",
        },
        req
      );

      return success(res, updated);
    } catch (error) {
      return handleError(res, error, "Failed caneling subject");
    }
  }
);

/* -------------------------------------------------------------------------- */
// *             Get all groups that a teacher teaches        */
/* -------------------------------------------------------------------------- */

router.get(
  "/all/teacher/:teacherId",
  validate(["teacher"]),
  async (req, res) => {
    try {
      const { teacherId } = req.params;

      const groups = await Group.find({ teacher: teacherId })
        .populate([{ path: "subject", select: "name" }])
        .select("_id subject number");

      return success(res, groups);
    } catch (error) {
      return handleError(res, error, "Failed getting teacher groups");
    }
  }
);

/* -------------------------------------------------------------------------- */
// *             Get all groups that a teacher teaches        */
/* -------------------------------------------------------------------------- */

router.delete("/delete/:groupId", validate("admin"), async (req, res) => {
  try {
    const { groupId } = req.params;

    const deleted = await Group.findByIdAndDelete(groupId);

    return success(res, { subject: deleted.subject });
  } catch (error) {
    return handleError(res, error, "Failed removing group.");
  }
});

export default router;
