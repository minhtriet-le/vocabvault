// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('word-list');

  let words = [];
  try {
    const res = await fetch('http://localhost:3000/api/words');
    words = await res.json();
  } catch {
    list.innerHTML = '<div style="color:#f87171;font-size:12px;padding:8px">Không thể kết nối server. Hãy chạy npm run dev.</div>';
  }

  if (words.length > 0) {
    list.innerHTML = '';
    words.slice(0, 10).forEach(w => {
      const div = document.createElement('div');
      div.className = 'word-item';
      div.innerHTML = `
        <div class="word-text">${w.word} <small style="color: #94a3b8; font-weight: normal;">${w.ipa}</small></div>
        <div class="word-def">${w.definition}</div>
      `;
      list.appendChild(div);
    });
  }

  document.getElementById('open-dashboard').onclick = () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  };
});
