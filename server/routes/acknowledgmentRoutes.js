
const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");

const {
  listMyAcknowledgments,
  acknowledgeRevision,
} = require("../controllers/acknowledgmentController");

const router = express.Router();

router.use(requireAuth);

router.get("/mine", listMyAcknowledgments);

router.post("/:revisionId/acknowledge", acknowledgeRevision);

module.exports = router;
