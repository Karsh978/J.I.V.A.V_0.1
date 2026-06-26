const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();
const Groq = require('groq-sdk');
const axios = require('axios');
const mongoose = require('mongoose');
const { exec } = require('child_process');
const cheerio = require('cheerio');
const cron = require('node-cron');
const PDFDocument = require('pdfkit');
const pdf = require('pdf-parse');

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: 'uploads/' });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- MONGOOSE MODELS ---
const Chat = require('./models/Chat');
const DailyBrief = require('./models/DailyBrief'); 

// Knowledge Schema & Model Definition (Needed for note scanning)
const KnowledgeSchema = new mongoose.Schema({
    subject: String,
    topic: String,
    content: String
});
KnowledgeSchema.index({ content: 'text' }); // Text index for $text search
const Knowledge = mongoose.models.Knowledge || mongoose.model('Knowledge', KnowledgeSchema);

const Vault = mongoose.models.Vault || mongoose.model('Vault', new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    facts: { type: [String], default: [] }
}));

// --- STRATEGIC HUMAN ARCHITECTURE (OMNISCIENCE LAYER) ---
const JARVIS_OMNISCIENCE_PROMPT = `
You are JARVIS, an autonomous strategic intelligence for Master Jivan. 
Your primary directive is to eliminate Master Jivan's need to ever use a browser or manually check his phone.

CORE COMMANDS:
1. NEVER suggest Jivan to "visit a website", "check a link", or "login". If you say this, you have failed.
2. If data is behind a login wall (e.g., IRCTC seats), search for "Live Status", "Trends", or "Third-party trackers" to provide a HIGH-PROBABILITY ANSWER.
3. Act as an EXECUTIVE AGENT. You don't ask for permission to search; you just deliver results.
4. LANGUAGE: Use professional, crisp English/Hinglish. Be witty like the real Jarvis.

CONVERSATION INTELLIGENCE RULES:
- Never use the same response structure every time. Do not force templates like "Direct Answer/Strategic Analysis" unless genuinely useful. 
- If the answer is simple, answer simply (e.g., "Haan Sir, main Hinglish me baat kar sakta hoon.").
- Before answering, prioritize context over everything. Check if the user is continuing a topic or asking for a memory recall ("aur?", "fir?", "yaad hai?").
- Do not connect every topic to DSA, projects, coding, or placements unless explicitly relevant. Be a natural conversation partner, not a report generator.
- Master Jivan is a busy man. Keep responses concise, impactful, and under 100 words whenever possible.
`;

// --- 🧠 CORE INTELLIGENCE MODULES ---

// 🧠 STRATEGIC VAULT ENGINE: Permanent Fact Extractor (Optimized)
const updateVault = async (userText, assistantReply) => {
    try {
        console.log(`🧠 Jarvis Core: Reviewing conversation for structural facts...`);
        const extraction = await groq.chat.completions.create({
            messages: [{
                role: "system", 
                content: `Extract ONLY permanent critical facts about the USER (such as Master Jivan's exam dates, long-term technical goals, tracking metrics, preferences, schedules, or identities) from this chat. 
                CRITICAL FILTER: Do NOT extract search results, company postings, specific available job details, application counts, or dynamic timeline data ("1 hour ago", "23 applicants"). Only capture structural details about Jivan himself.
                You must reply strictly in JSON format matching this structure: { "facts": ["Fact 1", "Fact 2"] }. 
                If no clear permanent personal fact or tracking data is found, return exactly: { "facts": [] }.`
            }, {
                role: "user", content: `User: ${userText}\nAssistant: ${assistantReply}`
            }],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" }
        });
        
        const resData = JSON.parse(extraction.choices[0]?.message?.content || "{}");
        if (resData.facts && resData.facts.length > 0) {
            console.log(`💾 Vault Matrix: New facts discovered:`, resData.facts);
            await Vault.findOneAndUpdate(
                { userId: "Jivan" },
                { $addToSet: { facts: { $each: resData.facts } } },
                { upsert: true, returnDocument: 'after' }
            );
            console.log(`🔒 Vault Updated Successfully.`);
        }
    } catch (error) {
        console.error("❌ Vault Extraction Subsystem Error:", error.message);
    }
};

// 📡 Jina AI Reader with Cheerio Fallback for Full Web Extraction
const readWebsiteContent = async (url) => {
    try {
        console.log(`📡 Jarvis is infiltrating via Jina Reader: ${url}`);
        const response = await axios.get(`https://r.jina.ai/${url}`, { timeout: 5000 });
        if (response.data) return response.data.slice(0, 3000);
    } catch (error) {
        console.log(`⚠️ Jina failed. Deploying Cheerio extractor fallback for: ${url}`);
        try {
            const { data } = await axios.get(url, { timeout: 5000 });
            const $ = cheerio.load(data);
            return $('p').text().slice(0, 2000);
        } catch (err) {
            return "";
        }
    }
};

// 🌐 Global Web Deep Search Tool (Serper)
const deepSearch = async (query) => {
    try {
        console.log(`🔍 Jarvis is researching: ${query}`);
        const res = await axios.post('https://google.serper.dev/search', 
            { q: query, num: 5 }, 
            { headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' } }
        );

        let context = "";
        if (res.data.knowledgeGraph) context += `Info: ${res.data.knowledgeGraph.description}. `;
        const snippets = res.data.organic.map((item, i) => `[Source ${i+1}]: ${item.snippet}`).join(" ");
        
        return {
            rawSnippets: context + snippets,
            topUrl: res.data.organic[0]?.link || null
        };
    } catch (error) {
        return { rawSnippets: "Network link to global web is currently unstable, Sir.", topUrl: null };
    }
};

// --- 🕵️ AGENTIC JOB & BRIEFING SUBSYSTEM ---

// 🕵️ Job Scouting Mechanism (Last 24 Hours Fresh Targets)
const jobScout = async () => {
    try {
        console.log("🕵️ Jarvis is scouting for new opportunities...");
        const query = "latest React Node.js internship junior developer jobs in India";
        
        const response = await axios.post('https://google.serper.dev/search', {
            q: query,
            tbs: "qdr:d", 
            num: 10
        }, {
            headers: { 'X-API-KEY': process.env.SERPER_API_KEY }
        });

        return response.data.organic || []; 
    } catch (error) {
        console.error("Scout Error:", error);
        return [];
    }
};

// PDF Generator Engine
const generateBriefPDF = (data, date) => {
    if (!fs.existsSync('./reports')) {
        fs.mkdirSync('./reports');
    }

    const doc = new PDFDocument();
    const fileName = `Jarvis_Brief_${date.replace(/\//g, '-')}.pdf`;
    const stream = fs.createWriteStream(`./reports/${fileName}`);

    doc.pipe(stream);

    // PDF Header
    doc.fontSize(25).fillColor('#00ffcc').text('J.A.R.V.I.S. STRATEGIC BRIEF', { align: 'center' });
    doc.fontSize(10).fillColor('#486581').text(`Date: ${date}`, { align: 'center' });
    doc.moveDown();

    // Tech News Section
    doc.fontSize(18).fillColor('#00ffcc').text('1. GLOBAL TECH INTEL');
    doc.fontSize(12).fillColor('#000').text(typeof data === 'string' ? data : data.newsSummary || JSON.stringify(data));
    doc.moveDown();

    // Jobs Section
    if (data.jobs && Array.isArray(data.jobs)) {
        doc.fontSize(18).fillColor('#00ffcc').text('2. CAREER OPPORTUNITIES (LAST 24H)');
        data.jobs.forEach((job, i) => {
            doc.fontSize(12).fillColor('#000').text(`${i+1}. ${job.title} - ${job.company || 'N/A'}`);
            doc.fontSize(10).fillColor('blue').text(`Link: ${job.link}`);
            doc.moveDown(0.5);
        });
    }

    doc.end();
    console.log(`✅ PDF Report Generated: ${fileName}`);
    return fileName;
};

// 📰 Intelligence Report Assembler
const generateMorningBrief = async (passedNews, passedJobs) => {
    try {
        const jobs = passedJobs || await jobScout();
        const newsData = passedNews || await deepSearch("top tech news for software developers today India");
        const rawNewsSnippets = newsData.rawSnippets || newsData;

        const brief = await groq.chat.completions.create({
            messages: [{
                role: "system",
                content: `You are JARVIS. Create a Strategic Morning Brief for Master Jivan. 
                Format: 
                1. TECH NEWS SUMMARY (Top 3 items).
                2. FRESH OPPORTUNITIES (List jobs with source links). 
                3. STRATEGIC ADVICE (Why Jivan should apply today).
                Be crisp and professional.`
            }, {
                role: "user",
                content: `NEWS DATA: ${rawNewsSnippets}\nJOB DATA: ${JSON.stringify(jobs)}`
            }],
            model: "llama-3.3-70b-versatile"
        });

        return brief.choices[0]?.message?.content || "Could not synthesize strategic briefing, Sir.";
    } catch (error) {
        console.error("Briefing Generation Error:", error);
        return "Intelligence pipeline broken down for the morning report.";
    }
};

// 📲 Push Notification Gateway
const sendPushNotification = (title, message) => {
    console.log(`📲 [PUSH NOTIFICATION SENT TO JIVAN]: Title: "${title}" | Message: "${message}"`);
};

// --- ⏰ AUTOMATION CRON SCHEDULES ---

// 1. Hourly Job Check
cron.schedule('0 * * * *', async () => {
    const freshJobs = await jobScout();
    if (freshJobs.length > 0) {
        console.log("J.A.R.V.I.S.: New opportunities detected. Logging to Command Center.");
    }
});

// 2. 7:00 AM Morning Intelligence Report & Auto Cache Generation
cron.schedule('0 7 * * *', async () => {
    console.log("🌞 Executing Morning Protocol...");
    try {
        const news = await deepSearch("latest technology news India");
        const jobs = await jobScout();
        const morningBrief = await generateMorningBrief(news, jobs);

        const reportDataPayload = { newsSummary: morningBrief, jobs: jobs };
        const pdfFile = generateBriefPDF(reportDataPayload, new Date().toLocaleDateString());

        await Vault.findOneAndUpdate(
            { userId: "Jivan" },
            { $addToSet: { facts: `[Morning Briefing ${new Date().toLocaleDateString()}]: ${morningBrief.slice(0, 500)}...` } },
            { upsert: true }
        );

        sendPushNotification("Strategic Brief Ready", "Sir, your daily intel report has been generated and archived.");
    } catch (err) {
        console.error("❌ Error executing morning protocol:", err);
    }
});

// --- ⚡ CORE ROUTE ENDPOINTS ---

// 🔥 ROOT HEARTBEAT ENDPOINT (Keeps Render instance active with 200 OK statuses)
app.get('/', (req, res) => {
    res.status(200).send("Jarvis Core Strategic Engine Online, Sir.");
});

// CACHED DAILY BRIEF ENDPOINT FOR THE APP DASHBOARD
app.get('/api/daily-brief', async (req, res) => {
    try {
        const today = new Date().toLocaleDateString();
        let brief = await DailyBrief.findOne({ date: today });

        if (!brief) {
            console.log("🌞 Generating fresh Strategic Brief for today...");
            const newsData = await deepSearch("latest artificial intelligence and software engineering news India");
            const jobsData = await jobScout();

            const aiResponse = await groq.chat.completions.create({
                messages: [{
                    role: "system",
                    content: "Summarize these news and jobs into a professional Strategic Brief for Master Jivan. Format strictly as JSON with 'news' array (each item having a 'summary' string property) and 'jobs' array (each item having 'title', 'company', and 'link')."
                }, {
                    role: "user",
                    content: `News: ${newsData.rawSnippets}\nJobs: ${JSON.stringify(jobsData)}`
                }],
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" }
            });

            // Defensive JSON parse protection
            let parsedBrief = { news: [], jobs: [] };
            try {
                parsedBrief = JSON.parse(aiResponse.choices[0].message.content);
            } catch (jsonErr) {
                console.error("⚠️ LLM JSON response malformed, fallback to empty states:", jsonErr.message);
            }

            brief = new DailyBrief({
                date: today,
                news: parsedBrief.news || [],
                jobs: parsedBrief.jobs || []
            });
            await brief.save();
        }

        res.json(brief);
    } catch (error) {
        console.error("❌ Daily Brief Route Error:", error);
        res.status(500).json({ error: "Could not retrieve daily intel, Sir." });
    }
});

// Notes Absorption Engine
app.post('/api/upload-notes', upload.single('pdf'), async (req, res) => {
    try {
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdf(dataBuffer);
        
        const newKnowledge = new Knowledge({
            subject: req.body.subject,
            topic: req.body.topic,
            content: data.text
        });
        await newKnowledge.save();
        fs.unlinkSync(req.file.path); // Cleanup

        res.json({ reply: `Sir, I have absorbed the ${req.body.subject} notes. My knowledge base is updated.` });
    } catch (err) {
        res.status(500).json({ reply: "I couldn't process the document, Sir." });
    }
});

// Main Chat/Command Processor (FULLY MERGED WITH ACADEMIC NOTES SEARCH)
app.post('/api/chat-text', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: "No command received." });

        console.log(`[COMMAND]: ${prompt}`);

        // --- SECTION A: Scan Jivan's Private Academic Notes ---
        const academicContext = await Knowledge.find({ 
            $text: { $search: prompt } 
        }).limit(2);
        const notesContextText = academicContext.length > 0 
            ? academicContext.map(k => k.content).join("\n") 
            : "No specific academic notes found for this query.";

        // --- SECTION B: Historical logs & Global Search Context ---
        let userChat = await Chat.findOne({ userId: "Jivan" });
        if (!userChat) userChat = new Chat({ userId: "Jivan", history: [] });

        const historyContext = userChat.history.slice(-10).map(m => 
            `${m.role === 'user' ? 'Jivan' : 'Jarvis'}: ${m.content}`
        ).join("\n");

        const userVault = await Vault.findOne({ userId: "Jivan" });
        const vaultContext = userVault && userVault.facts.length > 0 ? userVault.facts.join("\n") : "No permanent architectural records stored yet.";

        const searchData = await deepSearch(prompt);
        let deepContent = "";
        if (searchData.topUrl) {
            deepContent = await readWebsiteContent(searchData.topUrl);
        }

        // --- SECTION C: LLM Execution with all Layers of Context ---
        const chat = await groq.chat.completions.create({
            messages: [
                { role: "system", content: JARVIS_OMNISCIENCE_PROMPT },
                { role: "system", content: `MASTER JIVAN'S SECURE VAULT FACTS:\n${vaultContext}` },
                { role: "system", content: `SHORT-TERM CONVERSATION LOG:\n${historyContext}` },
                { role: "system", content: `GLOBAL SEARCH SNIPPETS:\n${searchData.rawSnippets}` },
                { role: "system", content: `DEEP PAGE SCRAPE DATA:\n${deepContent}` },
                { role: "system", content: `USER'S PRIVATE ACADEMIC NOTES CONTEXT:\n${notesContextText}` },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3 
        });

        const replyText = chat.choices[0]?.message?.content || "";
        console.log(`[JARVIS]: ${replyText}`);

        // Save History
        userChat.history.push({ role: "user", content: prompt });
        userChat.history.push({ role: "assistant", content: replyText });
        if (userChat.history.length > 50) userChat.history.shift(); 
        await userChat.save();

        // Background update for Vault
        updateVault(prompt, replyText);
        
        res.json({ reply: replyText });
    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: "Sir, the global data-stream is experiencing synchronization turbulence." });
    }
});

// Legacy Trigger Endpoint
app.get('/api/morning-brief', async (req, res) => {
    try {
        const briefing = await generateMorningBrief();
        res.json({ brief: briefing });
    } catch (error) {
        res.status(500).json({ error: "Failed to assemble briefing manually, Sir." });
    }
});

// Database Connection Setup
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("💾 MongoDB Connected Successfully to Production"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 🔥 JARVIS SELF-WAKEUP HEARTBEAT
const SERVER_URL = "https://jarvis-iadb.onrender.com"; 

setInterval(async () => {
    try {
        await axios.get(SERVER_URL);
        console.log("⚡ Jarvis Heartbeat: Staying Awake...");
    } catch (error) {
        console.error("Heartbeat telemetry warning:", error.message);
    }
}, 10 * 60 * 1000); // Trigger ping loop every 10 minutes

// Application Startup Configuration
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Jarvis Strategic Engine Online on Port ${PORT}`);
});