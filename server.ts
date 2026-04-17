import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cors from "cors";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "words.json");
const DICT_FILE = path.join(__dirname, "dict.json");

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Load local dictionary into memory
type DictEntry = { word: string; ipa: string; entries: { pos: string; defs: string[] }[] };
let dict: Record<string, DictEntry> = {};
if (fs.existsSync(DICT_FILE)) {
  dict = JSON.parse(fs.readFileSync(DICT_FILE, "utf-8"));
  console.log(`Dictionary loaded: ${Object.keys(dict).length.toLocaleString()} entries`);
} else {
  console.warn("dict.json not found. Run: node scripts/parseDict.js");
}

// Sorted keys for prefix suggestions
const dictKeys = Object.keys(dict).sort();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Serve extension files statically for preview/download
  app.use("/extension", express.static(path.join(__dirname, "extension")));

  // --- Dictionary lookup ---
  app.get("/api/lookup/:word", (req, res) => {
    const key = req.params.word.toLowerCase().trim();
    const entry = dict[key];
    if (!entry) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(entry);
  });

  // --- Autocomplete suggestions ---
  app.get("/api/suggest", (req, res) => {
    const q = ((req.query.q as string) || "").toLowerCase().trim();
    const limit = Math.min(Number(req.query.limit) || 8, 20);
    if (!q) { res.json([]); return; }

    // Binary search for first key >= q
    let lo = 0, hi = dictKeys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (dictKeys[mid] < q) lo = mid + 1;
      else hi = mid;
    }
    const results: string[] = [];
    for (let i = lo; i < dictKeys.length && results.length < limit; i++) {
      if (!dictKeys[i].startsWith(q)) break;
      results.push(dict[dictKeys[i]].word);
    }
    res.json(results);
  });

  // --- Words API ---
  app.get("/api/words", (_req, res) => {
    const words = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    res.json(words);
  });

  app.post("/api/words", (req, res) => {
    const word = req.body;
    if (!word || !word.word) {
      res.status(400).json({ error: "Invalid word data" });
      return;
    }
    const words = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    // Avoid duplicates
    if (!words.find((w: { word: string }) => w.word === word.word)) {
      words.unshift(word);
      fs.writeFileSync(DATA_FILE, JSON.stringify(words, null, 2));
    }
    res.json(word);
  });

  app.delete("/api/words/:id", (req, res) => {
    const words = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const filtered = words.filter((w: { id: string }) => w.id !== req.params.id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2));
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
