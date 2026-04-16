// content.js - Bôi đen từ → hiện popup nghĩa + nút lưu
const API_BASE = 'https://dict.minhqnd.com/api/v1';

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
  popup.innerHTML = `<div style="color:#94a3b8;font-size:11px">⏳ Đang tra từ...</div>`;
  document.body.appendChild(popup);

  // Adjust position if off screen
  const rect = popup.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    popup.style.left = (x - rect.width) + 'px';
  }

  try {
    const res = await fetch(`${API_BASE}/lookup?word=${encodeURIComponent(word)}&lang=en&def_lang=vi`);
    const data = await res.json();

    if (!data.exists || !data.results.length) {
      popup.innerHTML = `<div style="color:#f87171">Không tìm thấy "<b>${word}</b>"</div>`;
      setTimeout(removePopup, 2000);
      return;
    }

    const result = data.results[0];
    const meaning = result.meanings[0];
    const ipa = result.pronunciations[0]?.ipa || '';
    const ttsUrl = `${API_BASE}/tts?word=${encodeURIComponent(data.word)}&lang=en`;

    popup.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
        <div>
          <span style="font-weight:700;font-size:15px;color:#e2e8f0">${data.word}</span>
          ${meaning.pos ? `<span style="background:#334155;color:#94a3b8;font-size:10px;padding:1px 5px;border-radius:4px;margin-left:5px">${meaning.pos}</span>` : ''}
          ${ipa ? `<div style="color:#64748b;font-size:11px;margin-top:2px">${ipa}</div>` : ''}
        </div>
        <button id="vv-tts" title="Phát âm" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:16px;padding:0;flex-shrink:0">🔊</button>
      </div>
      <div style="color:#cbd5e1;margin-top:6px;font-size:12px">${meaning.definition}</div>
      ${meaning.example ? `<div style="color:#475569;font-size:11px;margin-top:4px;font-style:italic">"${meaning.example}"</div>` : ''}
      <button id="vv-save" style="margin-top:10px;width:100%;padding:6px;background:#6366f1;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">+ Lưu vào VocabVault</button>
    `;

    document.getElementById('vv-tts').onclick = (e) => {
      e.stopPropagation();
      new Audio(ttsUrl).play();
    };

    document.getElementById('vv-save').onclick = (e) => {
      e.stopPropagation();
      const btn = document.getElementById('vv-save');
      btn.innerText = '⏳ Đang lưu...';
      btn.disabled = true;
      chrome.runtime.sendMessage({ action: 'saveWord', word: data.word }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          btn.innerText = '❌ Lỗi lưu';
          btn.style.background = '#ef4444';
        } else {
          btn.innerText = '✅ Đã lưu!';
          btn.style.background = '#22c55e';
          setTimeout(removePopup, 1200);
        }
      });
    };

  } catch (err) {
    popup.innerHTML = `<div style="color:#f87171">Lỗi kết nối API</div>`;
    setTimeout(removePopup, 2000);
  }
}

function removePopup() {
  const existing = document.getElementById('vocabvault-popup');
  if (existing) existing.remove();
}

