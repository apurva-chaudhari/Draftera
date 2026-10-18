const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");

const {
  listClarifications,
  listMyClarifications,
  createClarification,
  respondToClarification,
  resolveClarification,
} = require("../controllers/clarificationController");

const router = express.Router();

router.use(requireAuth);

router.get("/mine", listMyClarifications);

router.get("/revision/:revisionId", listClarifications);

router.post("/revision/:revisionId", createClarification);

router.patch("/:clarificationId/respond", respondToClarification);

router.patch("/:clarificationId/resolve", resolveClarification);

module.exports = router;
