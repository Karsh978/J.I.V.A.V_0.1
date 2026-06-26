const mongoose = require('mongoose');

const VaultSchema = new mongoose.Schema({
    userId: { type: String, default: "Jivan" },
    facts: [{
        category: String, // e.g., "Exam", "Preference", "Project", "Travel"
        content: String,
        importance: { type: Number, default: 5 },
        timestamp: { type: Date, default: Date.now }
    }],
    strategicGoals: [String] // Jivan ke long-term sapne
});

module.exports = mongoose.model('Vault', VaultSchema);