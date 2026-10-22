require("dotenv").config();

const mongoose = require("mongoose");
const { validateEnv } = require("./config/env");

// Refuse to start with a broken configuration, and say exactly what is wrong.
// This runs before ./app is loaded because the storage client throws on
// missing Supabase settings the moment it is imported.
const { errors, warnings } = validateEnv();

warnings.forEach((warning) => console.warn(`Config warning: ${warning}`));

if (errors.length > 0) {
  console.error("Draftera API cannot start. Fix the environment first:");
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB before accepting requests.
async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Draftera API running on port ${PORT}`);
    });

    // Render stops the old instance with SIGTERM during a deploy. Finish the
    // requests in flight and close the database cleanly instead of cutting them off.
    let shuttingDown = false;
    const shutdown = (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`${signal} received, shutting down.`);

      server.close(async () => {
        await mongoose.connection.close().catch(() => {});
        process.exit(0);
      });

      // Do not hang forever on a stuck connection.
      setTimeout(() => process.exit(0), 10000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Unable to start Draftera API:", error.message);
    process.exit(1);
  }
}

startServer();
