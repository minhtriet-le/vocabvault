import { DictionaryResult, Word } from "../types";

const API_BASE = "https://dict.minhqnd.com/api/v1";

export async function lookupWord(word: string): Promise<Word | null> {
  try {
    const response = await fetch(`${API_BASE}/lookup?word=${encodeURIComponent(word)}&lang=en&def_lang=vi`);
    const data: DictionaryResult = await response.json();

    if (!data.exists || !data.results.length) return null;

    const firstResult = data.results[0];
    const firstMeaning = firstResult.meanings[0];

    return {
      id: Date.now().toString(),
      word: data.word,
      definition: firstMeaning.definition,
      ipa: firstResult.pronunciations[0]?.ipa || "",
      example: firstMeaning.example,
      pos: firstMeaning.pos,
      lang: "en",
      savedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Dictionary API Error:", error);
    return null;
  }
}

export async function getSuggestions(query: string, limit: number = 5): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE}/suggest?q=${encodeURIComponent(query)}&limit=${limit}`);
    return await response.json();
  } catch (error) {
    console.error("Suggestion API Error:", error);
    return [];
  }
}

export function getTTSUrl(word: string): string {
  return `${API_BASE}/tts?word=${encodeURIComponent(word)}&lang=en`;
}
