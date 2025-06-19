`use strict`

const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    if (!this.connection) {
      try {
        this.connection = await mongoose.connect(process.env.MONGO_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
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