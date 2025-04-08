const mongoose = require('mongoose');
const User = require('./models/User'); // Adjust path to your model

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
      name: 'User', // Add name
      username: 'user',
      email: 'user@a.com',
      password: 'user', // Add password
      role: 'user'
    });

    const admin = new User({
      name: 'Admin', // Add name
      username: 'admin',
      email: 'admin@a.com',
      password: 'admin', // Add password
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
