const express = require("express");
const router = express.Router();
const verifyJwt = require("../middleware/verifyJWT");
const managerController = require("../controllers/managerController");
const multer = require("multer");
const basicManagerCredential = require("../middleware/basicManagerCredential");

const upload = multer({
  storage: multer.memoryStorage(),
});

// Get company profile
router
  .route("/profile")
  .get(verifyJwt, basicManagerCredential, managerController.getCompanyProfile)
  .put(
    upload.fields([
      { name: "avatar", maxCount: 1 },
      { name: "wallpaper", maxCount: 1 },
      { name: "intro", maxCount: 10 },
    ]),
    verifyJwt,
    managerController.updateCompanyProfile
  );

router
  .route("/attendance")
  .post(verifyJwt, basicManagerCredential, managerController.attendance);

module.exports = router;
