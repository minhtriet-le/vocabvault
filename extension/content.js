// content.js - Highlight a word to show definition popup + save button
const LOCAL_SERVER = 'http://localhost:3000';

document.addEventListener('mouseup', (e) => {
  if (e.target && e.target.closest('#vocabvault-popup')) return;

  const selection = window.getSelection().toString().trim();
  // Only single words (no spaces)
  if (selection && /^[a-zA-Z'-]+$/.test(selection) && selection.length < 40) {
    showPopup(e.pageX, e.pageY, selection);
  } else {
    removePopup();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') removePopup();
});

async function showPopup(x, y, word) {
  removePopup();

  const popup = document.createElement('div');
  popup.id = 'vocabvault-popup';
  Object.assign(popup.style, {
    position: 'absolute',
    left: x + 'px',
    top: (y + 10) + 'px',
    zIndex: '2147483647',
    background: '#1e293b',
    color: '#f1f5f9',
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: '13px',
    maxWidth: '280px',
    minWidth: '180px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: '1.5',
    border: '1px solid #334155',
  });
  popup.innerHTML = `<div style="color:#94a3b8;font-size:11px">⏳ Looking up...</div>`;
  document.body.appendChild(popup);

  // Adjust position if off screen
  const rect = popup.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    popup.style.left = (x - rect.width) + 'px';
  }

  try {
    const res = await fetch(`${LOCAL_SERVER}/api/lookup/${encodeURIComponent(word.toLowerCase())}`);
    if (!res.ok) {
      popup.innerHTML = `<div style="color:#f87171">Word not found: "<b>${word}</b>"</div>`;
      setTimeout(removePopup, 2000);
      return;
    }
    const data = await res.json();

    if (!data.entries?.length) {
      popup.innerHTML = `<div style="color:#f87171">Word not found: "<b>${word}</b>"</div>`;
      setTimeout(removePopup, 2000);
      return;
    }

    const ipa = data.ipa || '';
    const pos = data.entries[0].pos || '';
    const definition = data.entries
      .map(({ pos: p, defs }) => `(${p}) ` + defs.map((d, i) => `${i + 1}. ${d}`).join('; '))
      .join(' | ');

    popup.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
        <div>
          <span style="font-weight:700;font-size:15px;color:#e2e8f0">${word}</span>
          ${pos ? `<span style="background:#334155;color:#94a3b8;font-size:10px;padding:1px 5px;border-radius:4px;margin-left:5px">${pos}</span>` : ''}
          ${ipa ? `<div style="color:#64748b;font-size:11px;margin-top:2px">${ipa}</div>` : ''}
        </div>
      </div>
      <div style="color:#cbd5e1;margin-top:6px;font-size:12px">${definition}</div>
      <button id="vv-save" style="margin-top:10px;width:100%;padding:6px;background:#6366f1;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">+ Save to VocabVault</button>
    `;

    document.getElementById('vv-save').onclick = (e) => {
      e.stopPropagation();
      const btn = document.getElementById('vv-save');
      btn.innerText = '⏳ Saving...';
      btn.disabled = true;
      chrome.runtime.sendMessage({ action: 'saveWord', word }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          btn.innerText = '❌ Failed';
          btn.style.background = '#ef4444';
        } else {
          btn.innerText = '✅ Saved!';
          btn.style.background = '#22c55e';
          setTimeout(removePopup, 1200);
        }
      });
    };

  } catch (err) {
    popup.innerHTML = `<div style="color:#f87171">Connection error</div>`;
    setTimeout(removePopup, 2000);
  }
}

function removePopup() {
  const existing = document.getElementById('vocabvault-popup');
  if (existing) existing.remove();
}

