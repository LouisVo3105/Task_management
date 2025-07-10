`use strict`

const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    if (!this.connection) {
      try {
        this.connection = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/task_management', {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          // Tăng connection pool size
          maxPoolSize: 100,
          minPoolSize: 5,
          // Tăng timeout
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          // Tối ưu cho production
          autoIndex: false,
          // Tăng write concern timeout
          wtimeoutMS: 10000,
          // Tăng read preference timeout
          readPreference: 'primary',
          readConcern: { level: 'local' }
        });
        console.log('Connected to MongoDB');
      } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
      }
    }
    return this.connection;
  }

  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  disconnect() {
    if (this.connection) {
      this.connection.disconnect();
      this.connection = null;
      console.log('Disconnected from MongoDB');
    }
  }
}

module.exports = Database;