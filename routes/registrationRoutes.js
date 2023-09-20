const express = require("express");
const router = express.Router();
const registrationController = require("../controllers/registrationController");

router.route("/user").post(registrationController.registration);

router.route("/company").post(registrationController.companyRegistration);

module.exports = router;
