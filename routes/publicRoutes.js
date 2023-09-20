const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");
const publicCredential = require("../middleware/publicCredential");

router.post("/allJobs", publicController.getAllJobs);

router.get("/job/:id", publicCredential, publicController.getJobInfo);

router.get("/company/:id", publicCredential, publicController.getCompanyInfo);

router.post("/company/:id/allJobs", publicController.getCompanyJobs);

router.post("/cities", publicController.getCities);

router.post("/districts", publicController.getDistricts);

router.get("/scale", publicController.getBusinessScale);

router.get("/jobTypes", publicController.getJobTypes);

router.get("/currency", publicController.getCurrency);

module.exports = router;
