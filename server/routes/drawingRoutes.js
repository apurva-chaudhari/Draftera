
const express = require("express");
const {
  publishRevision,
  listProjectRevisions,
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
module.exports = router;
