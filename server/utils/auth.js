
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { SESSION_HOURS } = require("./session");

const SALT_ROUNDS = 12;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be configured with at least 32 characters."
    );
  }

  return secret;
}

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function generateToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn: `${SESSION_HOURS}h`,
      issuer: "draftera-api",
      audience: "draftera-client",
    }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    issuer: "draftera-api",
    audience: "draftera-client",
  });
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
};
