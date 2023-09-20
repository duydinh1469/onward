const express = require("express");
const router = express.Router();
const verifyJwt = require("../middleware/verifyJWT");
const hrCredential = require("../middleware/hrCredential");
const hrPrivilege = require("../middleware/hrPrivilege");
const hrJobController = require("../controllers/hrJobController");

router.use(verifyJwt);
router.use(hrCredential);
router.route("/allJobs").post(hrJobController.getAllJobs);
router.route("/company/profile").get(hrJobController.getCompanyGeneralProfile);
router.route("/company/points").get(hrJobController.getCompanyPoints);
router.route("/job/:id").get(hrJobController.getJobById);

router.use(hrPrivilege);
router.route("/job").post(hrJobController.createJob);
router
  .route("/job/:id")
  .put(hrJobController.updateJob)
  .delete(hrJobController.deleteJob);
router.route("/job/:id/visible").patch(hrJobController.showJob);
router.route("/job/extend/:id").post(hrJobController.extendJob);
router.route("/candidate/job/:id").post(hrJobController.getAllJobCandidates);

module.exports = router;
