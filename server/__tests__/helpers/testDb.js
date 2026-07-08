const mongoose = require("mongoose");

// Use dedicated test database
const TEST_DB_URI =
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/cms_test";

const connect = async () => {
  // Close existing connection if any
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(TEST_DB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS:         5000,
  });
};

const clearDatabase = async () => {
  if (mongoose.connection.readyState === 0) return;

  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((col) =>
      col.deleteMany({}).catch(() => {})
    )
  );
};

const closeDatabase = async () => {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
};

module.exports = { connect, clearDatabase, closeDatabase };