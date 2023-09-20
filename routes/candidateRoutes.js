const express = require("express");
const router = express.Router();
const verifyJwt = require("../middleware/verifyJWT");
const candidateController = require("../controllers/candidateController");
const candidateCredential = require("../middleware/candidateCredential");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
});

// Report post
router
  .route("/report")
  .post(
    upload.array("reportImages", 10),
    verifyJwt,
    candidateCredential,
    candidateController.reportJob
  );

// Other function
router.use(verifyJwt);
router.use(candidateCredential);
router.route("/candidateCV").get(candidateController.getCV);
router.route("/apply").post(candidateController.applyJob);
router
  .route("/like")
  .post(candidateController.markJob)
  .delete(candidateController.unmarkJob);
router
  .route("/follow")
  .post(candidateController.followCompany)
  .delete(candidateController.unfollowCompany);
router.route("/allApplied").post(candidateController.getAllAppliedJobs);
router.route("/allLikes").post(candidateController.getAllMarkedJobs);
router.route("/allFollow").post(candidateController.getAllFollowingCompany);

module.exports = router;
