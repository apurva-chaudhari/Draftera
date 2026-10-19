/**
 * The real-world side of backups: which collections to save, how to connect,
 * and how to move PDFs in and out of Supabase Storage. Used by the
 * backup / restore / verify scripts.
 */
const path = require("node:path");
const mongoose = require("mongoose");

const User = require("../models/User");
const Project = require("../models/Project");
const Drawing = require("../models/Drawing");
const DrawingRevision = require("../models/DrawingRevision");
const Acknowledgment = require("../models/Acknowledgment");
const Clarification = require("../models/Clarification");
const ActivityLog = require("../models/ActivityLog");

const STORAGE_BUCKET = "drawing-revisions";

// Every model that holds data. Add new models here or they will NOT be
// backed up (a test checks this list against the registered models).
const MODELS = [User, Project, Drawing, DrawingRevision, Acknowledgment, Clarification, ActivityLog];
const collectionNames = () => MODELS.map((model) => model.collection.name);

const ejson = () => mongoose.mongo.BSON.EJSON;

async function openClient(uri) {
  if (!uri) throw new Error("MONGODB_URI is missing from server/.env.");
  const client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  return client;
}

/** Recreate the indexes (unique codes, one acknowledgment per person...). */
async function createIndexes(db) {
  for (const model of MODELS) {
    for (const [fields, options] of model.schema.indexes()) {
      await db.collection(model.collection.name).createIndex(fields, options);
    }
  }
}

function storageFiles() {
  const supabase = require("../config/storage"); // needs SUPABASE_* in .env

  return {
    async fileSource(key) {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(key);
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    },
    async fileSink(key, buffer) {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(key, buffer, { contentType: "application/pdf", upsert: true });
      if (error) throw new Error(`Could not upload ${key}: ${error.message}`);
    },
  };
}

/** Tiny argument parser: positional values and --flag / --name value. */
function parseArgs(argv, valued = []) {
  const flags = {};
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      if (valued.includes(name)) flags[name] = argv[++i];
      else flags[name] = true;
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

const timestamp = (date = new Date()) =>
  date.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);

const defaultBackupDir = () => path.join(__dirname, "..", "backups");

module.exports = {
  MODELS,
  STORAGE_BUCKET,
  collectionNames,
  ejson,
  openClient,
  createIndexes,
  storageFiles,
  parseArgs,
  timestamp,
  defaultBackupDir,
};
