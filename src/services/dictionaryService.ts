import { Word } from "../types";

const SERVER = "http://localhost:3000";

const POS_SHORT: Record<string, string> = {
  "danh từ": "n.",
  "động từ": "v.",
  "nội động từ": "v.",
  "ngoại động từ": "v.",
  "tính từ": "adj.",
  "trạng từ": "adv.",
  "thán từ": "interj.",
  "giới từ": "prep.",
  "liên từ": "conj.",
  "đại từ": "pron.",
  "số từ": "num.",
  "mạo từ": "art.",
  "phó từ": "adv.",
};

function shortPOS(pos: string): string {
  for (const [k, v] of Object.entries(POS_SHORT)) {
    if (pos.includes(k)) return v;
  }
  return pos;
}

export async function lookupWord(word: string): Promise<Word | null> {
  try {
    const res = await fetch(`${SERVER}/api/lookup/${encodeURIComponent(word.toLowerCase())}`);
    if (!res.ok) return null;
    const data: { word: string; ipa: string; entries: { pos: string; defs: string[] }[] } = await res.json();

    if (!data.entries?.length) return null;

    // Build compact definition string: "(n.) 1. def; 2. def | (v.) 1. def"
    const definition = data.entries
      .map(({ pos, defs }) => {
        const label = shortPOS(pos);
        return `(${label}) ${defs.map((d, i) => `${i + 1}. ${d}`).join("; ")}`;
      })
      .join(" | ");

    return {
      id: Date.now().toString(),
      word: data.word,
      definition,
      ipa: data.ipa,
      example: "",
      pos: shortPOS(data.entries[0].pos),
      lang: "en",
      savedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Dictionary lookup error:", error);
    return null;
  }
}

export async function getSuggestions(query: string, limit: number = 8): Promise<string[]> {
  try {
    const res = await fetch(`${SERVER}/api/suggest?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export function getTTSUrl(_word: string): string {
  return "";
}



