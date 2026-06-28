const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const saveBtn = document.getElementById('saveBtn');
const copyBtn = document.getElementById('copyBtn');
const noteLink = document.getElementById('noteLink');
const status = document.getElementById('status');
const noteList = document.getElementById('noteList');

const api = {
  create: '/api/notes',
  list: '/api/notes',
  note: (id) => `/api/notes/${id}`,
};

const setStatus = (message, isError = false) => {
  status.textContent = message;
  status.style.color = isError ? '#dc2626' : '#334155';
};

const updateRecentNotes = async () => {
  try {
    const res = await fetch(api.list);
    const notes = await res.json();
    noteList.innerHTML = notes
      .slice(0, 10)
      .reverse()
      .map((note) => {
        const noteTitle = note.title || note.id;
        return `
          <li>
            <p class="note-title">${noteTitle}</p>
            <p class="note-meta"><a href="${api.note(note.id)}">View note</a></p>
          </li>
        `;
      })
      .join('');
  } catch (error) {
    noteList.innerHTML = '<li>Unable to fetch recent notes.</li>';
  }
};

const showShareLink = (id) => {
  const url = `${window.location.origin}${window.location.pathname}?note=${id}`;
  noteLink.innerHTML = `<a href="${url}">${url}</a>`;
  noteLink.classList.remove('hidden');
  copyBtn.classList.remove('hidden');
};

const copyUrl = async () => {
  const link = noteLink.querySelector('a');
  if (!link) return;

  try {
    await navigator.clipboard.writeText(link.href);
    setStatus('Link copied to clipboard.');
  } catch {
    setStatus('Unable to copy link automatically. Please copy it manually.', true);
  }
};

const createNote = async () => {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!content) {
    setStatus('Please enter a note before saving.', true);
    return;
  }

  saveBtn.disabled = true;
  setStatus('Saving note...');

  try {
    const response = await fetch(api.create, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save note.');
    }

    titleInput.value = '';
    contentInput.value = '';
    setStatus('Note saved successfully.');
    showShareLink(data.id);
    updateRecentNotes();
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    saveBtn.disabled = false;
  }
};

const fetchSharedNote = async (id) => {
  try {
    const res = await fetch(api.note(id));
    if (!res.ok) {
      setStatus('Shared note not found.', true);
      return;
    }

    const note = await res.json();
    titleInput.value = note.title;
    contentInput.value = note.content;
    setStatus('Loaded shared note. You can edit and save it again.');
  } catch (error) {
    setStatus('Unable to load note.', true);
  }
};

const loadFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  const noteId = params.get('note');
  if (noteId) {
    fetchSharedNote(noteId);
  }
};

saveBtn.addEventListener('click', createNote);
copyBtn.addEventListener('click', copyUrl);
window.addEventListener('load', () => {
  updateRecentNotes();
  loadFromQuery();
});
