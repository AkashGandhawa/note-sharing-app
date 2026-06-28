const titleInput = document.getElementById('title');
const tagsInput = document.getElementById('tags');
const contentInput = document.getElementById('content');
const expiresInput = document.getElementById('expiresInHours');
const saveBtn = document.getElementById('saveBtn');
const previewBtn = document.getElementById('previewBtn');
const copyBtn = document.getElementById('copyBtn');
const noteLink = document.getElementById('noteLink');
const status = document.getElementById('status');
const noteList = document.getElementById('noteList');
const searchInput = document.getElementById('searchInput');
const previewPane = document.getElementById('previewPane');

const api = {
  create: '/api/notes',
  list: '/api/notes',
  note: (id) => `/api/notes/${id}`,
};

const escapeHtml = (value = '') => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const renderMarkdown = (source = '') => {
  if (!source.trim()) {
    return '<p class="preview-empty">Nothing to preview yet.</p>';
  }

  const lines = source.split('\n');
  const html = [];
  let paragraph = [];
  let listItems = [];
  let inCodeBlock = false;
  let codeLines = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${paragraph.join(' ').trim()}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length) {
      html.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join('')}</ul>`);
      listItems = [];
    }
  };

  const flushCodeBlock = () => {
    if (codeLines.length) {
      html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      codeLines = [];
    }
  };

  const renderInline = (text) => {
    let rendered = escapeHtml(text);
    rendered = rendered.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    rendered = rendered.replace(/\*(.*?)\*/g, '<em>$1</em>');
    rendered = rendered.replace(/`([^`]+)`/g, '<code>$1</code>');
    return rendered;
  };

  lines.forEach((line) => {
    if (line.startsWith('```')) {
      flushParagraph();
      flushList();
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (/^###\s/.test(line)) {
      flushParagraph();
      flushList();
      html.push(`<h3>${renderInline(line.replace(/^###\s/, ''))}</h3>`);
      return;
    }

    if (/^##\s/.test(line)) {
      flushParagraph();
      flushList();
      html.push(`<h2>${renderInline(line.replace(/^##\s/, ''))}</h2>`);
      return;
    }

    if (/^#\s/.test(line)) {
      flushParagraph();
      flushList();
      html.push(`<h1>${renderInline(line.replace(/^#\s/, ''))}</h1>`);
      return;
    }

    if (/^-\s/.test(line)) {
      flushParagraph();
      listItems.push(renderInline(line.replace(/^-\s/, '')));
      return;
    }

    flushList();
    if (line.trim()) {
      paragraph.push(line.trim());
    } else if (paragraph.length) {
      flushParagraph();
    }
  });

  flushParagraph();
  flushList();
  flushCodeBlock();
  return html.join('');
};

const setStatus = (message, isError = false) => {
  status.textContent = message;
  status.style.color = isError ? '#dc2626' : '#334155';
};

const updateRecentNotes = async (search = '') => {
  try {
    const query = new URLSearchParams({ search }).toString();
    const res = await fetch(`${api.list}${query ? `?${query}` : ''}`);
    const notes = await res.json();

    if (!notes.length) {
      noteList.innerHTML = '<li>No notes found.</li>';
      return;
    }

    noteList.innerHTML = notes
      .slice(0, 10)
      .map((note) => {
        const noteTitle = escapeHtml(note.title || note.id);
        const tagMarkup = (note.tags || [])
          .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
          .join('');

        return `
          <li>
            <p class="note-title">${noteTitle}</p>
            <p class="note-meta"><a href="${api.note(note.id)}">View note</a></p>
            <div class="tag-list">${tagMarkup}</div>
          </li>
        `;
      })
      .join('');
  } catch (error) {
    noteList.innerHTML = '<li>Unable to fetch recent notes.</li>';
  }
};

const showShareLink = (id) => {
  const url = `${window.location.origin}/note/${id}`;
  noteLink.innerHTML = `Share this note: <a href="${url}">${url}</a>`;
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

const updatePreview = () => {
  previewPane.innerHTML = renderMarkdown(contentInput.value);
  previewPane.classList.remove('hidden');
};

const togglePreview = () => {
  if (previewPane.classList.contains('hidden')) {
    updatePreview();
  } else {
    previewPane.classList.add('hidden');
  }
};

const createNote = async () => {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const expiresInHours = expiresInput.value ? Number(expiresInput.value) : null;
  const tags = tagsInput.value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

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
      body: JSON.stringify({ title, content, tags, expiresInHours }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save note.');
    }

    titleInput.value = '';
    tagsInput.value = '';
    contentInput.value = '';
    expiresInput.value = '';
    previewPane.innerHTML = '';
    previewPane.classList.add('hidden');
    setStatus('Note saved successfully.');
    showShareLink(data.id);
    updateRecentNotes(searchInput.value);
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
    updatePreview();
    setStatus('Loaded shared note. You can edit and save it again.');
  } catch (error) {
    setStatus('Unable to load note.', true);
  }
};

const loadFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const noteId = params.get('note') || window.location.pathname.split('/').filter(Boolean).pop();
  if (noteId && window.location.pathname.startsWith('/note/')) {
    fetchSharedNote(noteId);
  }
};

saveBtn.addEventListener('click', createNote);
previewBtn.addEventListener('click', togglePreview);
copyBtn.addEventListener('click', copyUrl);
contentInput.addEventListener('input', updatePreview);
searchInput.addEventListener('input', (event) => {
  updateRecentNotes(event.target.value);
});
window.addEventListener('load', () => {
  updateRecentNotes();
  loadFromLocation();
});
