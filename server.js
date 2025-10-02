// server.js
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// JSONBin Configuration
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID || '68de84e7d0ea881f4092e71b';
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$u5q.3R/7OYkK3ZAy4Bjc.ulceZIhuAwWrBrgtTKOTBSvN8c/7asiG';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- Helper Functions for JSONBin ----

async function readDatabase() {
    try {
        const response = await fetch(JSONBIN_URL + '/latest', {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error('Failed to read from JSONBin');
        }

        const result = await response.json();
        return result.record; // JSONBin wraps data in 'record'
    } catch (error) {
        console.error('Error reading database:', error);
        return null;
    }
}

async function writeDatabase(data) {
    try {
        const response = await fetch(JSONBIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to write to JSONBin');
        }

        return await response.json();
    } catch (error) {
        console.error('Error writing database:', error);
        return null;
    }
}

// ---- HTML Page Routes ----
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/new', (req, res) => res.sendFile(path.join(__dirname, 'views', 'new.html')));
app.get('/manage', (req, res) => res.sendFile(path.join(__dirname, 'views', 'manage.html')));

// ---- API Routes for Data ----

// GET all scripts
app.get('/api/scripts', async (req, res) => {
    const db = await readDatabase();
    
    if (!db) {
        return res.status(500).json({ message: 'Error reading database' });
    }
    
    res.json(db.scripts || []);
});

// Get all sentences for a specific PROJECT ID
app.get('/api/scripts/project/:projectId', async (req, res) => {
    const { projectId } = req.params;
    const db = await readDatabase();
    
    if (!db) {
        return res.status(500).json({ message: 'Error reading database' });
    }
    
    const projectScripts = db.scripts.filter(s => s.projectId === projectId);
    res.json(projectScripts);
});

// Get single script by ID
app.get('/api/scripts/:id', async (req, res) => {
    const { id } = req.params;
    const db = await readDatabase();
    
    if (!db) {
        return res.status(500).json({ message: 'Error reading database' });
    }
    
    const script = db.scripts.find(s => s.id === id);
    
    if (!script) {
        return res.status(404).json({ message: 'Script not found' });
    }
    
    res.json(script);
});

// POST to save/update scripts based on Project ID
app.post('/api/save', async (req, res) => {
    const { scriptsToSave, projectIdToUpdate } = req.body;

    const db = await readDatabase();
    
    if (!db) {
        return res.status(500).json({ message: 'Error reading database' });
    }
    
    // Initialize scripts array if it doesn't exist
    if (!db.scripts) {
        db.scripts = [];
    }
    
    // If updating, first remove all old entries for that project
    if (projectIdToUpdate) {
        db.scripts = db.scripts.filter(s => s.projectId !== projectIdToUpdate);
    }

    // The projectId is now part of each sentence object
    const parentProjectId = scriptsToSave[0]?.projectId;
    if (!parentProjectId) {
        return res.status(400).json({ message: 'Project ID is missing in the save data.' });
    }

    scriptsToSave.forEach(script => {
        db.scripts.push({
            id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            projectId: parentProjectId,
            sentence: script.sentence,
            videoNumber: script.videoNumber,
            details: script.details,
            date: new Date().toLocaleDateString()
        });
    });

    const result = await writeDatabase(db);
    
    if (!result) {
        return res.status(500).json({ message: 'Error saving to database' });
    }
    
    res.status(200).json({ message: 'Project saved successfully!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📁 Using JSONBin for data storage`);
});