






















// import Grade from "./models/grade.js";
// import mongoose from "mongoose";

// /**
//  * Returns { subject, term, percent, gpa } for a (student, subject, term).
//  * percent is 0..100; gpa on a 4.0 scale (example mapping below).
//  */
// export async function computeSubjectGPA({ studentId, subjectId, term }) {
//     const [row] = await Grade.aggregate([
//         {
//             $match: {
//                 student: new mongoose.Types.ObjectId(studentId),
//                 subject: new mongoose.Types.ObjectId(subjectId), 
//                 term
//             }
//         },
//         {
//             $lookup: {
//                 from: "assessments",
//                 localField: "assessment",
//                 foreignField: "_id",
//                 as: "a",
//             }
//         },
//         { $unwind: "$a" }, // attach assessment
//         {
//             // contribution = (score/maxPoints) * weight
//             $project: {
//                 contribution: { $multiply: [{ $divide: ["$score", "$a.maxPoints"] }, "$a.weight"] },
//                 subject: 1, term: 1
//             }
//         },
//         {
//             $group: {
//                 _id: { subject: "$subject", term: "$term" },
//                 total: { $sum: "$contribution" },
//             }
//         },
//         {
//             $project: {
//                 subject: "$_id.subject",
//                 term: "$_id.term",
//                 percent: { $multiply: ["$total", 100] }, // 0..100
//             }
//         }
//     ]);

//     if (!row) return null;

//     // Example 4.0 scale mapping (customize as needed)
//     const toGPA = (pct) => {
//         if (pct >= 93) return 4.0;
//         if (pct >= 90) return 3.7;
//         if (pct >= 87) return 3.3;
//         if (pct >= 83) return 3.0;
//         if (pct >= 80) return 2.7;
//         if (pct >= 77) return 2.3;
//         if (pct >= 73) return 2.0;
//         if (pct >= 70) return 1.7;
//         if (pct >= 67) return 1.3;
//         if (pct >= 65) return 1.0;
//         return 0.0;
//     };

//     return { ...row, gpa: toGPA(row.percent) };
// }