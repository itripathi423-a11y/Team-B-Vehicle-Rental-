function isLoggedIn(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }
  next();
}

function isAdmin(req, res, next) {
  if (!req.session || req.session.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin only access",
    });
  }
  next();
}

module.exports = { isLoggedIn, isAdmin };
