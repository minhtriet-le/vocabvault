// background.js - Service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveWord') {
    lookupAndSave(request.word).then(result => {
      if (result) {
        sendResponse({ success: true, data: result });
      } else {
        sendResponse({ success: false, error: 'Word not found in dictionary' });
      }
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep channel open for async
  }
});

async function lookupAndSave(word) {
  try {
    const res = await fetch(`http://localhost:3000/api/lookup/${encodeURIComponent(word.toLowerCase())}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.entries?.length) return null;

    // Build compact definition
    const definition = data.entries
      .map(({ pos, defs }) => `(${pos}) ` + defs.map((d, i) => `${i + 1}. ${d}`).join('; '))
      .join(' | ');

    const wordObj = {
      id: Date.now().toString(),
      word: data.word,
      lang: 'en',
      definition,
      ipa: data.ipa,
      example: '',
      pos: data.entries[0].pos,
      savedAt: new Date().toISOString(),
    };

    await fetch('http://localhost:3000/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wordObj),
    });

    return wordObj;
  } catch (error) {
    console.error('Save failed:', error);
  }
  return null;
}
