const fs = require('fs');
const path = require('path');
const shortid = require('shortid');

const dataPath = path.join(__dirname, '..', 'data', 'notes.json');

const ensureStore = () => {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, '[]', 'utf8');
  }
};

const readNotes = () => {
  ensureStore();
  const raw = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(raw);
};

const writeNotes = (notes) => {
  ensureStore();
  fs.writeFileSync(dataPath, JSON.stringify(notes, null, 2), 'utf8');
};

const createNote = ({ title = '', content = '', tags = [], expiresInHours = null }) => {
  const notes = readNotes();
  const createdAt = new Date();
  const expiresAt = expiresInHours
    ? new Date(createdAt.getTime() + expiresInHours * 60 * 60 * 1000).toISOString()
    : null;

  const note = {
    id: shortid.generate(),
    title: title.trim().slice(0, 100),
    content: content.trim(),
    tags: tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
    expiresAt,
  };

  notes.push(note);
  writeNotes(notes);
  return note;
};

const getNote = (id) => {
  const notes = readNotes();
  const note = notes.find((item) => item.id === id);
  if (!note) {
    return null;
  }

  if (note.expiresAt && new Date(note.expiresAt) <= new Date()) {
    const remainingNotes = notes.filter((item) => item.id !== id);
    writeNotes(remainingNotes);
    return null;
  }

  return note;
};

const listNotes = (search = '') => {
  const notes = readNotes();
  const term = search.trim().toLowerCase();

  const activeNotes = notes.filter((note) => !note.expiresAt || new Date(note.expiresAt) > new Date());

  if (!term) {
    return activeNotes.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return activeNotes
    .filter((note) => {
      const haystack = `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase();
      return haystack.includes(term);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

module.exports = {
  createNote,
  getNote,
  listNotes,
};
