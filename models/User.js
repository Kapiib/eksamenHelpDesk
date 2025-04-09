const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlenght: 3
    },
    role: {
        type: String,
        enum: ['user', 'admin', "1st-line", "2nd-line"],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    ticketsAssigned: {
        type: Number,
        default: 0
    },
    ticketsClosed: {
        type: Number,
        default: 0
    },
    ticketsResolved: {
        type: Number,
        default: 0
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;