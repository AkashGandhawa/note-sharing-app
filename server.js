const express = require('express');
const cors = require('cors');
const path = require('path');
const { createNote, getNote, listNotes } = require('./src/noteStore');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/notes', (req, res) => {
  const { title = '', content = '', tags = [], expiresInHours = null } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Note content is required.' });
  }

  if (expiresInHours !== null && (!Number.isInteger(Number(expiresInHours)) || Number(expiresInHours) < 1)) {
    return res.status(400).json({ error: 'Expiration must be a whole number of hours.' });
  }

  const note = createNote({ title, content, tags, expiresInHours: expiresInHours ? Number(expiresInHours) : null });
  res.status(201).json(note);
});

app.get('/api/notes/:id', (req, res) => {
  const note = getNote(req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found or it has expired.' });
  }
  res.json(note);
});

app.get('/api/notes', (req, res) => {
  const search = req.query.search || '';
  const notes = listNotes(search);
  res.json(notes.map(({ id, title, createdAt, tags }) => ({ id, title, createdAt, tags })));
});

app.get('/note/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Note sharing app listening on http://localhost:${port}`);
});
