const mongoose = require('mongoose');

const KnowledgeSchema = new mongoose.Schema({
    userId: { type: String, default: "Jivan" },
    subject: String,
    topic: String,
    content: String, // PDF se nikala hua text
    sourceFile: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Knowledge', KnowledgeSchema);