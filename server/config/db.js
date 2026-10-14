
const mongoose = require("mongoose");

/**
 * Connects the Draftera backend to MongoDB Atlas.
 * The database URI must be stored in the server's .env file.
 */
async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing from the server environment.");
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("Draftera database connected successfully.");
  } catch (error) {
    console.error("Draftera database connection failed:", error.message);
    throw error;
  }
}

module.exports = connectDB;
