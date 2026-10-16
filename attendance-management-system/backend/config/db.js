/**
 * Database connection.
 *
 * - If MONGODB_URI is provided in .env, connect to that real MongoDB instance.
 * - Otherwise, spin up an in-memory MongoDB (mongodb-memory-server) so the
 *   project is runnable out-of-the-box with zero external setup.
 */
const mongoose = require('mongoose');

let memoryServer = null;

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    if (!uri) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('MONGODB_URI is required in production; in-memory data is not persistent.');
      }

      // Lazy-require so production installs don't need the dev dependency.
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
      console.log('⚙️  Using in-memory MongoDB (dev mode):', uri);
    }

    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, { dbName: process.env.DB_NAME || 'attendance_db' });

    console.log(`✅ MongoDB connected → ${mongoose.connection.host}/${mongoose.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB runtime error:', err.message);
    });

    return mongoose.connection;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  if (memoryServer) await memoryServer.stop();
};

module.exports = { connectDB, disconnectDB };
