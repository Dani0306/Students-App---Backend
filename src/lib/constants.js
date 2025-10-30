export const ACTIONS = {
  user: {
    loginSuccess: "LOGIN_SUCCESS",
    loginFailure: "LOGIN_FAILURE",
    changePassword: "PASSWORD_CHANGE",
    changeRole: "CHANGE_ROLE",
    createUser: "CREATE_USER",
    modifyProfile: "MODIFY_PROFILE",
    blockUser: "BLOCK_USER",
    unblockUser: "UNBLOCK_USER",
  },
  subject: {
    createSubject: "CREATE_SUBJECT",
    deleteOneSubject: "DELETE_ONE_SUBJECT",
    deleteAllSubjects: "DELETE_ALL_SUBJECTS",
    modifySubject: "MODIFY_SUBJECT",
    cancelSubject: "CANCEL_SUBJECT",
  },
  group: {
    createGroup: "CREATE_GROUP",
    addUser: "ADD_USER_TO_GROUP",
    deleteGroup: "DELETE_GROUP",
    deleteAllGroups: "DELETE_ALL_GROUPS",
    removeUser: "DELETE_USER",
    modifyGroup: "MODIFY_GROUP",
  },
  assessment: {
    createAssessment: "CREATE_ASSESSMENT",
    modifyAssessment: "MODIFY_ASSESSMENT",
    deleteAssessment: "DELETE_ASSESSMENT",
    deleteAllAssessments: "DELETE_ALL_ASSESSMENTS",
  },
  grade: {
    createGrade: "CREATE_GRADE",
    modifyGrade: "MODIFY_GRADE",
    deleteGrade: "DELETE_GRADE",
    deleteAllGrades: "DELETE_ALL_GRADES",
  },
};
