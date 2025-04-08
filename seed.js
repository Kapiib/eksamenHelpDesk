const mongoose = require('mongoose');
const argon2 = require('argon2');
const User = require('./models/User'); // Adjust path to your model

const mongoURI = process.env.MONGO_URI || 'mongodb://admin:password1@10.12.52.71:27017/helpDesk?authSource=helpDesk';

async function seedDatabase() {
  try {
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    console.log('Existing users deleted');

    const hashedUserPassword = await argon2.hash('user');
    const hashedAdminPassword = await argon2.hash('admin');

    const user = new User({
      name: 'User',
      username: 'user',
      email: 'user@a.com',
      password: hashedUserPassword,
      role: 'user'
    });

    const admin = new User({
      name: 'Admin',
      username: 'admin',
      email: 'admin@a.com',
      password: hashedAdminPassword,
      role: 'admin'
    });

    await user.save();
    await admin.save();
    console.log('User and Admin seeded successfully');

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase();