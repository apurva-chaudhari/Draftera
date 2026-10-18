const express = require("express");
const {
  publishRevision,
  listProjectRevisions,
  getRevisionDetail,
  openRevisionFile,
  addRecipients,
} = require("../controllers/revisionController");

const { requireAuth } = require("../middleware/authMiddleware");
const {
  upload,
  validatePdfSignature,
} = require("../middleware/uploadMiddleware");
const {
  uploadDrawingRevision,
} = require("../controllers/drawingController");

const router = express.Router();

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

module.exports = router;
