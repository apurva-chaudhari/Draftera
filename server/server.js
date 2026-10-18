require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB before accepting requests.
async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Draftera API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start Draftera API:", error.message);
    process.exit(1);
  }
}

startServer();
