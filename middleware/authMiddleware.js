const requireLogin = (req, res, next) => {
  // Prevent browser caching of protected pages
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  if (!req.session.user) {
    return res.redirect("/auth/login");
  }

  next();
};

const requireRole = (role) => {
  return (req, res, next) => {
    // Prevent browser caching of protected pages
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    if (!req.session.user) {
      return res.redirect("/auth/login");
    }

    if (req.session.user.role !== role) {
      return res.status(403).send("Access denied.");
    }

    next();
  };
};

module.exports = {
  requireLogin,
  requireRole,
};
