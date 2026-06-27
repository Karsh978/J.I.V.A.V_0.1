const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    userId: { type: String, default: "Jivan" },
    title: { type: String, default: "New Chat" }, // 🆕 Chat title
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
}, { timestamps: true }); // 🆕 createdAt, updatedAt auto

module.exports = mongoose.model('Chat', ChatSchema);