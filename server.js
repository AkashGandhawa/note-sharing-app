const express = require('express');
const cors = require('cors');
const shortid = require('shortid');
const path = require('path');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const notes = new Map();

app.post('/api/notes', (req, res) => {
  const { title = '', content = '' } = req.body;
  if (!content.trim()) {
    return res.status(400).json({ error: 'Note content is required.' });
  }

  const id = shortid.generate();
  const note = {
    id,
    title: title.trim().slice(0, 100),
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  notes.set(id, note);
  res.status(201).json(note);
});

app.get('/api/notes/:id', (req, res) => {
  const note = notes.get(req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found.' });
  }
  res.json(note);
});

app.get('/api/notes', (req, res) => {
  res.json(Array.from(notes.values()).map(({ id, title, createdAt }) => ({ id, title, createdAt })));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Note sharing app listening on http://localhost:${port}`);
});
