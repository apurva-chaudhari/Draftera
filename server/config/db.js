
const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI is missing from the server environment."
    );
  }

  const maxAttempts = 5;
  const retryDelayMs = 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });

      console.log("Draftera database connected successfully.");
      return;
    } catch (error) {
      console.error(
        `MongoDB connection attempt ${attempt}/${maxAttempts} failed:`,
        error.message
      );

      if (attempt === maxAttempts) {
        throw new Error(
          "Unable to connect to MongoDB Atlas after 5 attempts."
        );
      }

      console.log(
        `Retrying database connection in ${retryDelayMs / 1000} seconds...`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, retryDelayMs)
      );
    }
  }
}

module.exports = connectDB;
