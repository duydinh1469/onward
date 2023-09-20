const express = require("express");
const router = express.Router();
const verifyJwt = require("../middleware/verifyJWT");
const userController = require("../controllers/userController");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
});

// MULTER MIDDLEWARE SECTION
// multer will override req.body so all middleware which modify req.body before multer will be lost
// Get and  update user profile
router.get("/auth", verifyJwt, userController.getAuth);
router.get("/profile", verifyJwt, userController.getUserProfile);
router.put(
  "/profile",
  upload.fields([
    { name: "cv", maxCount: 1 },
    { name: "avatar", maxCount: 1 },
  ]),
  verifyJwt,
  userController.updateUserProfile
);

// Change password need to retrieve password
router.route("/changePassword").post(verifyJwt, userController.changePassword);

module.exports = router;
