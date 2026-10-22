const express = require("express");
const {
  publishRevision,
  listProjectRevisions,
  getRevisionDetail,
  openRevisionFile,
  addRecipients,
  askDrawingQuestion,
} = require("../controllers/revisionController");

const { requireAuth } = require("../middleware/authMiddleware");
const { rateLimiter } = require("../middleware/rateLimiter");
const {
  upload,
  validatePdfSignature,
} = require("../middleware/uploadMiddleware");
const {
  uploadDrawingRevision,
} = require("../controllers/drawingController");

const router = express.Router();

// Each AI question costs money and quota, so cap how fast one client can ask.
const aiLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many questions. Please wait a minute.",
  // Per person, so a whole site office behind one router does not share a limit.
  key: (req) => (req.user ? `user:${req.user._id}` : undefined),
});

router.use(requireAuth);

router.post(
  "/upload",
  upload.single("file"),
  validatePdfSignature,
  uploadDrawingRevision
);
router.post("/:revisionId/publish", publishRevision);
router.get("/project/:projectId", listProjectRevisions);
router.get("/revision/:revisionId", getRevisionDetail);
router.post("/revision/:revisionId/open", openRevisionFile);
router.post("/revision/:revisionId/recipients", addRecipients);
router.post("/revision/:revisionId/ask", aiLimiter, askDrawingQuestion);

module.exports = router;
