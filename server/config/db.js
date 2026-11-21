const mongoose = require("mongoose");

mongoose.set("bufferCommands", false);

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      console.warn("⚠️  MONGODB_URI is not defined — database running in offline fallback mode");
      return null;
    }

    console.log("🔄 Connecting to MongoDB...");

    const conn = await mongoose.connect(uri);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database Name: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(`⚠️  MongoDB Connection Error: ${error.message} — continuing in offline mode`);
    return null;
  }
};

module.exports = connectDB;