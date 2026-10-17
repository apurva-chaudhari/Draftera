
const mongoose = require("mongoose");

const Acknowledgment = require("../models/Acknowledgment");
const DrawingRevision = require("../models/DrawingRevision");

const listMyAcknowledgments = async (req, res, next) => {
  try {
    const acknowledgments = await Acknowledgment.find({
      recipient: req.user._id,
    })
      .populate({
        path: "revision",
        select: "revisionNumber issueDate changeSummary status publishedAt drawing",
        populate: {
          path: "drawing",
          select: "drawingNumber title",
        },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: acknowledgments.length,
      acknowledgments,
    });
  } catch (error) {
    return next(error);
  }
};

const acknowledgeRevision = async (req, res, next) => {
  try {
    const { revisionId } = req.params;

    if (!mongoose.isValidObjectId(revisionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid revision ID.",
      });
    }

    const revision = await DrawingRevision.findById(revisionId);

    if (!revision || revision.status !== "published") {
      return res.status(404).json({
        success: false,
        message: "Published revision not found.",
      });
    }

    const acknowledgment = await Acknowledgment.findOne({
      revision: revision._id,
      recipient: req.user._id,
    });

    if (!acknowledgment) {
      return res.status(403).json({
        success: false,
        message: "You are not a recipient of this revision.",
      });
    }

    if (acknowledgment.status === "acknowledged") {
      return res.status(200).json({
        success: true,
        message: "This revision has already been acknowledged.",
        acknowledgment,
      });
    }

    acknowledgment.status = "acknowledged";
    acknowledgment.acknowledgedAt = new Date();
    await acknowledgment.save();

    return res.status(200).json({
      success: true,
      message: "Revision acknowledged successfully.",
      acknowledgment,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listMyAcknowledgments,
  acknowledgeRevision,
};
