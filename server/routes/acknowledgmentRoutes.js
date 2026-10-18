const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");

const {
  listMyAcknowledgments,
  acknowledgeRevision,
  sendReminder,
} = require("../controllers/acknowledgmentController");

const router = express.Router();

router.use(requireAuth);

router.get("/mine", listMyAcknowledgments);

router.post("/:revisionId/acknowledge", acknowledgeRevision);

router.post("/:revisionId/remind/:userId", sendReminder);

module.exports = router;
