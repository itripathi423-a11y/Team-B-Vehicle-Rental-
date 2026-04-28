const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/admin.servicing.controllers");

router.get("/", serviceController.getServiceList);
router.put("/mark/:id", serviceController.markServiced);
router.put("/:id", serviceController.updateServiceStatus);

module.exports = router;
