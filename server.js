const express = require("express");
const app = express();
const http = require('http');
const server = http.createServer(app);  // Create HTTP server
const { Server } = require('socket.io'); // Import Server from socket.io
const io = new Server(server);          // Initialize Socket.IO with server
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const path = require("path");
require("dotenv").config();
const RateLimit = require("express-rate-limit");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const connectDB = require("./db/dbConfig");
const checkJWT = require('./utils/checkJWT');

// Connect to database
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    useTempFiles: true
}));

// Import Routes
const getRoutes = require("./routes/getRoutes");
const authRoutes = require("./routes/authRoutes");
const ticketRoutes = require("./routes/ticketRoutes");

// app.use
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(checkJWT);
app.set('socketio', io);

// Socket.IO
io.on('connection', (socket) => {
    console.log('A user connected');

    // Join ticket room for specific ticket
    socket.on('join-ticket', (ticketId) => {
        socket.join(`ticket-${ticketId}`);
        console.log(`User joined ticket room: ${ticketId}`);
    });
    
    // Join tickets list room to receive updates about new tickets
    socket.on('join-tickets-list', () => {
        socket.join('tickets-list');
        console.log('User joined tickets list room');
    });

    // Listen for new responses
    socket.on('new-response', (data) => {
        // Broadcast to everyone in the ticket room except sender
        socket.to(`ticket-${data.ticketId}`).emit('response-received', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Routes 
app.use("/", getRoutes);
app.use("/auth", authRoutes);
app.use("/tickets", ticketRoutes);

// Port
const PORT = process.env.PORT;
server.listen(PORT, () => {  // Use server.listen instead of app.listen
    console.log(`Running on http://localhost:${PORT}`);
});