require('dotenv').config();
const mongoose = require('mongoose');
const argon2 = require('argon2');
const User = require('./models/User');

// Get MongoDB URI from environment variables
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error('MONGO_URI environment variable is not set');
  process.exit(1);
}

async function seedDatabase() {
  try {
    // Connect to MongoDB with updated options (useNewUrlParser and useUnifiedTopology are no longer needed in newer mongoose)
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('Existing users deleted');

    // Create password hashes
    const hashedUserPassword = await argon2.hash('user');
    const hashedAdminPassword = await argon2.hash('admin');
    
    // Create 1 admin user
    const admin = new User({
      name: 'Admin User',
      email: 'admin@a.com',
      password: hashedAdminPassword,
      role: 'admin',
      ticketsAssigned: 0,
      ticketsClosed: 0,
      ticketsResolved: 0
    });
    
    // Create 3 regular users
    const user1 = new User({
      name: 'User One',
      email: 'user1@a.com',
      password: hashedUserPassword,
      role: 'user',
      ticketsAssigned: 0,
      ticketsClosed: 0,
      ticketsResolved: 0
    });
    
    const user2 = new User({
      name: 'User Two',
      email: 'user2@a.com',
      password: hashedUserPassword,
      role: 'user',
      ticketsAssigned: 0,
      ticketsClosed: 0,
      ticketsResolved: 0
    });
    
    const user3 = new User({
      name: 'User Three',
      email: 'user3@a.com',
      password: hashedUserPassword,
      role: 'user',
      ticketsAssigned: 0,
      ticketsClosed: 0,
      ticketsResolved: 0
    });

    // Create 1st-line support user
    const firstLineSupport = new User({
      name: '1st Line Support',
      email: '1stline@example.com',
      password: hashedUserPassword,
      role: '1st-line',
      ticketsAssigned: 0,
      ticketsClosed: 0,
      ticketsResolved: 0
    });

    // Create 2nd-line support user
    const secondLineSupport = new User({
      name: '2nd Line Support',
      email: '2ndline@example.com',
      password: hashedUserPassword,
      role: '2nd-line',
      ticketsAssigned: 0,
      ticketsClosed: 0,
      ticketsResolved: 0
    });

    // Save all users
    await Promise.all([
      admin.save(),
      user1.save(),
      user2.save(),
      user3.save(),
      firstLineSupport.save(),
      secondLineSupport.save()
    ]);
    
    console.log('Database seeded successfully with 1 admin, 3 users, 1 1st-line support, and 1 2nd-line support');

    // Disconnect from database
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedDatabase();