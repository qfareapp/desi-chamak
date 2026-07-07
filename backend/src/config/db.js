const mongoose = require("mongoose");

async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set. Copy backend/.env.example to backend/.env.");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");
}

module.exports = connectToDatabase;
