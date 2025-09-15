// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- HTML Page Routes ----
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/new', (req, res) => res.sendFile(path.join(__dirname, 'views', 'new.html')));
app.get('/manage', (req, res) => res.sendFile(path.join(__dirname, 'views', 'manage.html')));

// ---- API Routes for Data ----

// GET all scripts
app.get('/api/scripts', (req, res) => {
    fs.readFile('database.json', 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: 'Error reading database' });
        res.json(JSON.parse(data).scripts);
    });
});

// UPDATED: Get all sentences for a specific PROJECT ID
app.get('/api/scripts/project/:projectId', (req, res) => {
    const { projectId } = req.params;
    fs.readFile('database.json', 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: 'Error reading database' });
        
        const scripts = JSON.parse(data).scripts;
        const projectScripts = scripts.filter(s => s.projectId === projectId);
        res.json(projectScripts);
    });
});

// UPDATED: POST to save/update scripts based on Project ID
app.post('/api/save', (req, res) => {
    const { scriptsToSave, projectIdToUpdate } = req.body;

    fs.readFile('database.json', 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: 'Error reading database' });
        
        const db = JSON.parse(data);
        
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
                projectId: parentProjectId, // Add the parent project ID
                sentence: script.sentence,
                videoNumber: script.videoNumber,
                details: script.details,
                date: new Date().toLocaleDateString()
            });
        });

        fs.writeFile('database.json', JSON.stringify(db, null, 2), (err) => {
            if (err) return res.status(500).json({ message: 'Error saving to database' });
            res.status(200).json({ message: 'Project saved successfully!' });
        });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});