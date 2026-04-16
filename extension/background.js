// background.js - Service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveWord') {
    lookupAndSave(request.word).then(result => {
      if (result) {
        sendResponse({ success: true, data: result });
      } else {
        sendResponse({ success: false, error: 'Không tìm thấy từ trong từ điển' });
      }
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep channel open for async
  }
});

async function lookupAndSave(word) {
  const API_URL = `https://dict.minhqnd.com/api/v1/lookup?word=${encodeURIComponent(word)}&lang=en&def_lang=vi`;
  
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    
    if (data.exists && data.results.length > 0) {
      const firstResult = data.results[0];
      const firstMeaning = firstResult.meanings[0];
      
      const wordObj = {
        id: Date.now().toString(),
        word: data.word,
        lang: 'en',
        definition: firstMeaning.definition,
        ipa: firstResult.pronunciations[0]?.ipa || '',
        example: firstMeaning.example,
        pos: firstMeaning.pos,
        saved_at: new Date().toISOString()
      };
      
      // Save to server API
      await fetch('http://localhost:3000/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wordObj),
      });

      return wordObj;
    }
  } catch (error) {
    console.error('Save failed:', error);
  }
  return null;
}
