const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    userId: { type: String, default: "Jivan" },
    dailyGoals: [{
        task: String,
        status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
        timestamp: { type: Date, default: Date.now }
    }],
    projects: [{
        name: String,
        stack: [String],
        status: String
    }],
    academicStatus: {
        subjects: [String],
        examDates: Object
    }
});

module.exports = mongoose.model('Profile', ProfileSchema);