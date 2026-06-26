const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    userId: { type: String, default: "Jivan" },
    history: [{
        role: { type: String, enum: ['user', 'assistant'] },
        content: String,
        timestamp: { type: Date, default: Date.now }
    }],
    userProfile: {
        skills: [String],
        currentGoals: [String],
        preferences: Object
    }
});

module.exports = mongoose.model('Chat', ChatSchema);