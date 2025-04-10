const mongoose = require('mongoose');
const Ticket = require('./models/Ticket');
const User = require('./models/User');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;

async function seedTickets() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Get existing users
    const users = await User.find({});
    if (!users || users.length === 0) {
      console.error('No users found! Run seed.js first to create users.');
      process.exit(1);
    }

    // Find specific users by role or create placeholders
    const adminUser = users.find(u => u.role === 'admin') || users[0]; // Use first user as fallback
    const regularUser = users.find(u => u.role === 'user') || users[0];
    const firstLineUser = users.find(u => u.role === '1st-line') || adminUser;
    const secondLineUser = users.find(u => u.role === '2nd-line') || adminUser;

    // Log what we found - useful for debugging
    console.log('Found users:');
    console.log('- Admin:', adminUser ? adminUser.name : 'None');
    console.log('- Regular:', regularUser ? regularUser.name : 'None');
    console.log('- 1st line:', firstLineUser ? firstLineUser.name : 'None');
    console.log('- 2nd line:', secondLineUser ? secondLineUser.name : 'None');

    // Check if we have all required users
    if (!adminUser || !regularUser) {
      console.error('Missing required user roles. Creating some users with required roles...');
      
      // Create temp users
      if (!users.find(u => u.role === 'user')) {
        const newRegular = new User({
          name: 'Regular User',
          email: 'user@a.com',
          password: '$argon2id$v=19$m=65536,t=3,p=4$...',  // Use a dummy hash
          role: 'user'
        });
        await newRegular.save();
        console.log('Created temporary regular user');
        regularUser = newRegular;
      }
      
      if (!users.find(u => u.role === '1st-line')) {
        const new1stLine = new User({
          name: '1st Line Support',
          email: '1stline@a.com',
          password: '$argon2id$v=19$m=65536,t=3,p=4$...',  // Use a dummy hash
          role: '1st-line'
        });
        await new1stLine.save();
        console.log('Created temporary 1st-line user');
        firstLineUser = new1stLine;
      }
      
      if (!users.find(u => u.role === '2nd-line')) {
        const new2ndLine = new User({
          name: '2nd Line Support',
          email: '2ndline@a.com',
          password: '$argon2id$v=19$m=65536,t=3,p=4$...',  // Use a dummy hash
          role: '2nd-line'
        });
        await new2ndLine.save();
        console.log('Created temporary 2nd-line user');
        secondLineUser = new2ndLine;
      }
    }

    // Delete existing tickets
    await Ticket.deleteMany({});
    console.log('Existing tickets deleted');

    // Create new tickets
    const tickets = [
      {
        title: 'PC starter ikke etter Windows-oppdatering',
        description: 'Etter den siste Windows-oppdateringen vil ikke PC-en min starte opp. Den viser bare en svart skjerm med blinkende markør.',
        category: 'Hardware',
        status: 'Open',
        priority: 'High',
        createdBy: regularUser._id,
        assignedRole: 'unassigned',
        assignedTo: null
      },
      {
        title: 'Kan ikke koble til bedriftsnettverk',
        description: 'Jeg får feilmeldingen "Autentisering mislyktes" når jeg prøver å koble til bedriftsnettverket fra hjemmekontoret. VPN-klienten ser ut til å koble til, men jeg får ikke tilgang til noen interne ressurser.',
        category: 'Network',
        status: 'In Progress',
        priority: 'Medium',
        createdBy: regularUser._id,
        assignedRole: '1st-line',
        assignedTo: firstLineUser._id,
        responses: [
          {
            text: 'Har du prøvd å restarte VPN-klienten og router?',
            createdBy: firstLineUser._id,
            createdAt: new Date()
          },
          {
            text: 'Ja, jeg har prøvd begge deler, men problemet vedvarer.',
            createdBy: regularUser._id,
            createdAt: new Date(Date.now() + 1000 * 60 * 30) // 30 minutes later
          }
        ]
      },
      {
        title: 'Outlook synkroniserer ikke e-post',
        description: 'Outlook på PC-en min har sluttet å synkronisere nye e-poster. Jeg kan se dem på mobilen, men ikke på datamaskinen min. Jeg har prøvd å restarte programmet.',
        category: 'Software',
        status: 'Resolved',
        priority: 'Medium',
        createdBy: regularUser._id,
        assignedRole: '1st-line',
        assignedTo: firstLineUser._id,
        responses: [
          {
            text: 'Kan du sjekke om Outlook er i offline-modus? Klikk på "Send/Motta" fanen og se om du kan slå av "Arbeid offline".',
            createdBy: firstLineUser._id,
            createdAt: new Date()
          },
          {
            text: 'Det fungerte! Takk for hjelpen!',
            createdBy: regularUser._id,
            createdAt: new Date(Date.now() + 1000 * 60 * 45) // 45 minutes later
          }
        ],
        resolvedAt: new Date()
      },
      {
        title: 'Behov for tilgang til prosjektmappe',
        description: 'Jeg trenger tilgang til prosjektmappen "Prosjekt X" på bedriftsserveren. Jeg er nylig overført til markedsavdelingen og jobber nå med dette prosjektet.',
        category: 'Account',
        status: 'Closed',
        priority: 'Low',
        createdBy: regularUser._id,
        assignedRole: '1st-line',
        assignedTo: firstLineUser._id,
        responses: [
          {
            text: 'Tilgang er nå gitt. Du skal ha tilgang til mappen innen 30 minutter.',
            createdBy: firstLineUser._id,
            createdAt: new Date()
          },
          {
            text: 'Takk, jeg har nå tilgang til mappen.',
            createdBy: regularUser._id,
            createdAt: new Date(Date.now() + 1000 * 60 * 60) // 1 hour later
          }
        ],
        resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
      },
      {
        title: 'Database-server svarer ikke',
        description: 'Vår produksjons-database-server svarer ikke, og dette påvirker alle CRM-systemer. Ingen av kundeservicerepresentantene kan få tilgang til kundeopplysninger. Dette er kritisk for virksomheten.',
        category: 'Network',
        status: 'In Progress',
        priority: 'Critical',
        createdBy: firstLineUser._id,
        assignedRole: '2nd-line',
        assignedTo: secondLineUser._id,
        responses: [
          {
            text: 'Vi undersøker saken. Foreløpige undersøkelser tyder på et problem med databasens tilkoblingspool. Jobber med å løse problemet.',
            createdBy: secondLineUser._id,
            createdAt: new Date()
          },
          {
            text: 'Kan dere gi et estimat på når systemet vil være oppe igjen? Kundeserviceavdelingen trenger en oppdatering.',
            createdBy: firstLineUser._id,
            createdAt: new Date(Date.now() + 1000 * 60 * 15) // 15 minutes later
          },
          {
            text: 'Vi regner med å ha systemet oppe igjen innen 1 time. Vi implementerer en midlertidig løsning nå, og vil følge opp med en permanent fiks i morgen.',
            createdBy: secondLineUser._id,
            createdAt: new Date(Date.now() + 1000 * 60 * 25) // 25 minutes later
          }
        ]
      }
    ];

    // Insert tickets to database
    await Ticket.insertMany(tickets);
    console.log(`${tickets.length} tickets created successfully`);

    // Update user counters
    if (firstLineUser) {
      await User.findByIdAndUpdate(firstLineUser._id, { 
        $inc: { 
          ticketsAssigned: 3,
          ticketsResolved: 1,
          ticketsClosed: 1
        } 
      });
    }
    
    if (secondLineUser) {
      await User.findByIdAndUpdate(secondLineUser._id, { 
        $inc: { ticketsAssigned: 1 } 
      });
    }

    console.log('User statistics updated');
    console.log('Database seeding completed successfully');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

seedTickets();