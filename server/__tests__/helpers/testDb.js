const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

const connect = async () => {
  // Close existing connection if any
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri, {
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
  if (mongoServer) {
    await mongoServer.stop();
  }
};

module.exports = { connect, clearDatabase, closeDatabase };