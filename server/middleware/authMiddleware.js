
const User = require("../models/User");
const { verifyToken } = require("../utils/auth");
const { readCookie, SESSION_COOKIE } = require("../utils/session");

async function requireAuth(req, res, next) {
  try {
    // The session token only travels in the httpOnly cookie.
    const token = readCookie(req, SESSION_COOKIE);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const payload = verifyToken(token);

    if (!payload.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid or inactive user account.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError" ||
        error.name === "NotBeforeError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    return next(error);
  }
}

module.exports = { requireAuth };
