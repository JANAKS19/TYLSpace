const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json()); // parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // serve your HTML/JS/CSS

const DATA_FILE = path.join(__dirname, 'public', 'data.json');

// GET /data
app.get('/data', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, content) => {
    if (err) return res.status(500).json({ error: 'Error reading file' });
    try {
      const data = JSON.parse(content);
      res.status(200).json(data);
    } catch (e) {
      res.status(500).json({ error: 'Invalid JSON in file' });
    }
  });
});

// POST /data
app.post('/data', (req, res) => {
  fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2), 'utf8', (err) => {
    if (err) return res.status(500).json({ error: 'Error saving file' });
    res.status(200).json({ status: 'success' });
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
