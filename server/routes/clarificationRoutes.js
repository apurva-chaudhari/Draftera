
const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");

const {
  listClarifications,
  createClarification,
  respondToClarification,
} = require("../controllers/clarificationController");

const router = express.Router();

router.use(requireAuth);

router.get("/revision/:revisionId", listClarifications);

router.post("/revision/:revisionId", createClarification);

router.patch("/:clarificationId/respond", respondToClarification);

module.exports = router;
