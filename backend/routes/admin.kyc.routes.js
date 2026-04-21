const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/admin.kyc.controller");

router.get("/", ctrl.getAllKyc);
router.put("/:id", ctrl.updateKycStatus);

module.exports = router;
