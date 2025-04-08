const mongoose = require('mongoose');
const User = require('./models/User'); // Adjust path to your model

// MongoDB connection string (use your .env variable or hardcoded string)
const mongoURI = process.env.MONGO_URI || 'mongodb://admin:password1@10.12.52.71:27017/helpDesk?authSource=helpDesk';

async function seedDatabase() {
  try {
    // Connect to the database
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Clear existing users (optional)
    await User.deleteMany({});
    console.log('Existing users deleted');

    // Create user and admin
    const user = new User({
      username: 'user123',
      email: 'user@example.com',
      role: 'user'
    });

    const admin = new User({
      username: 'admin123',
      email: 'admin@example.com',
      role: 'admin'
    });

    // Save to the database
    await user.save();
    await admin.save();
    console.log('User and Admin seeded successfully');

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase();
