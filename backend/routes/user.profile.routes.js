const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/user.profile.controller");

function requireUser(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }
  next();
}

router.get("/profile", requireUser, ctrl.getProfile);
router.put("/profile", requireUser, ctrl.updateProfile);
router.put("/change-password", requireUser, ctrl.changePassword);
router.delete("/account", requireUser, ctrl.deleteAccount);

module.exports = router;
