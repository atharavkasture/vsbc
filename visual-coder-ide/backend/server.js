require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const apiRoutes = require('./routes/api'); 

const app = express();
// Use Environment Variable for Port
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------
// 1. MONGODB CONNECTION
// ---------------------------------------------------------
// Use Environment Variable for Mongo URI
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ FATAL ERROR: MONGO_URI is missing in .env file.");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// ---------------------------------------------------------
// 2. SCHEMAS
// ---------------------------------------------------------
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const graphSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    nodes: { type: Array, default: [] }, 
    edges: { type: Array, default: [] }, 
    updatedAt: { type: Date, default: Date.now }
});

const functionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    functionData: { type: Object, required: true }, 
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Graph = mongoose.model('Graph', graphSchema);
const SavedFunction = mongoose.model('SavedFunction', functionSchema);

// ---------------------------------------------------------
// 3. MIDDLEWARE
// ---------------------------------------------------------
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: "No token provided" });
    try {
        // Use Environment Variable for Secret
        const secret = process.env.JWT_SECRET || 'secret123';
        const decoded = jwt.verify(token, secret);
        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ error: "Unauthorized" });
    }
};

// ---------------------------------------------------------
// 4. AUTH ROUTES
// ---------------------------------------------------------
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: "User already exists" });
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });
        await user.save();
        res.json({ success: true, message: "User created" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid password" });
        
        const secret = process.env.JWT_SECRET || 'secret123';
        const token = jwt.sign({ id: user._id }, secret, { expiresIn: '7d' });
        res.json({ token, email: user.email });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---------------------------------------------------------
// 5. PROJECT ROUTES (Cloud Save Logic)
// ---------------------------------------------------------
app.get('/api/graphs', verifyToken, async (req, res) => {
    try {
        const graphs = await Graph.find({ userId: req.userId }).select('name updatedAt');
        res.json(graphs);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/graphs/:id', verifyToken, async (req, res) => {
    try {
        const graph = await Graph.findOne({ _id: req.params.id, userId: req.userId });
        if (!graph) return res.status(404).json({ error: "Graph not found" });
        res.json(graph);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/graphs', verifyToken, async (req, res) => {
    try {
        const { id, name, nodes, edges } = req.body;

        // LOGIC 1: If ID provided, update specific project
        if (id) {
            const updated = await Graph.findOneAndUpdate(
                { _id: id, userId: req.userId }, 
                { name, nodes, edges, updatedAt: Date.now() },
                { new: true }
            );
            if (updated) return res.json({ success: true, id: updated._id });
        }

        // LOGIC 2: Check by NAME to prevent duplicates
        const existingByName = await Graph.findOne({ userId: req.userId, name: name });

        if (existingByName) {
            // Update existing project with same name
            existingByName.nodes = nodes;
            existingByName.edges = edges;
            existingByName.updatedAt = Date.now();
            await existingByName.save();
            return res.json({ success: true, id: existingByName._id });
        }

        // LOGIC 3: Create NEW project
        const newGraph = new Graph({ userId: req.userId, name, nodes, edges });
        await newGraph.save();
        res.json({ success: true, id: newGraph._id });

    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/graphs/:id', verifyToken, async (req, res) => {
    try {
        await Graph.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---------------------------------------------------------
// 6. FUNCTION ROUTES (Cloud Save Logic)
// ---------------------------------------------------------
app.get('/api/functions', verifyToken, async (req, res) => {
    try {
        const funcs = await SavedFunction.find({ userId: req.userId }).select('name description updatedAt');
        res.json({ functions: funcs });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/functions/:id', verifyToken, async (req, res) => {
    try {
        const func = await SavedFunction.findOne({ _id: req.params.id, userId: req.userId });
        if (!func) return res.status(404).json({ error: "Function not found" });
        res.json({ functionData: func.functionData });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/functions', verifyToken, async (req, res) => {
    try {
        const { name, description, functionData } = req.body;
        
        // Upsert Logic: Check if function with name exists
        const existing = await SavedFunction.findOne({ userId: req.userId, name });
        
        if (existing) {
            existing.functionData = functionData;
            existing.description = description;
            existing.updatedAt = Date.now();
            await existing.save();
        } else {
            const newFunc = new SavedFunction({ userId: req.userId, name, description, functionData });
            await newFunc.save();
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/functions/:id', verifyToken, async (req, res) => {
    try {
        await SavedFunction.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LEGACY ROUTES (Local Files) ---
const PROJECTS_DIR = path.join(__dirname, 'saved_projects');
const FUNCTIONS_DIR = path.join(__dirname, 'saved_functions');
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR);
if (!fs.existsSync(FUNCTIONS_DIR)) fs.mkdirSync(FUNCTIONS_DIR);

app.post('/api/save-project', (req, res) => { res.json({success:true}) });
app.post('/api/save-function', (req, res) => { res.json({success:true}) });
app.delete('/api/delete-project/:name', (req, res) => { res.json({success:true}) });

app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`🚀 IDE Server running on http://localhost:${PORT}`);
});
