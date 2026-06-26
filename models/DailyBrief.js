const mongoose = require('mongoose');

const DailyBriefSchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true },
    news: [
        {
            summary: { type: String, required: true }
        }
    ],
    jobs: [
        {
            title: { type: String, required: true },
            company: { type: String },
            link: { type: String, required: true }
        }
    ],
    createdAt: { type: Date, default: Date.now, expires: 2592000 } // Auto-deletes after 30 days
});

module.exports = mongoose.model('DailyBrief', DailyBriefSchema);