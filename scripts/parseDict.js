/**
 * Parses anhviet109K.txt → dict.json
 *
 * Input format:
 *   @word /ipa/
 *   *  part of speech
 *   - definition
 *   =example+ translation   (skipped)
 *
 * Output: { "word": { word, ipa, entries: [{ pos, defs[] }] } }
 * Key is lowercased word for O(1) lookup.
 *
 * Run: node scripts/parseDict.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT = path.join(__dirname, "..", "anhviet109K.txt");
const OUTPUT = path.join(__dirname, "..", "dict.json");

const text = fs.readFileSync(INPUT, "utf-8");
const lines = text.split("\n");

const dict = {};

let word = null;
let ipa = "";
let pos = "";
let defs = [];
let entries = [];

function flushPOS() {
  if (pos && defs.length > 0) {
    entries.push({ pos, defs: [...defs] });
  }
  pos = "";
  defs = [];
}

function flushWord() {
  if (!word) return;
  flushPOS();
  if (entries.length > 0) {
    dict[word.toLowerCase()] = { word, ipa, entries: [...entries] };
  }
  word = null;
  ipa = "";
  entries = [];
}

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line) continue;

  if (line.startsWith("@")) {
    flushWord();
    // Everything after @ until the first '/' is the headword
    const body = line.slice(1);
    const slashIdx = body.indexOf("/");
    if (slashIdx === -1) {
      word = body.trim();
      ipa = "";
    } else {
      word = body.slice(0, slashIdx).trim();
      // Grab first /.../
      const ipaMatch = body.slice(slashIdx).match(/\/[^/]+\//);
      ipa = ipaMatch ? ipaMatch[0] : "";
    }
  } else if (line.startsWith("*") && word) {
    flushPOS();
    // POS line: "*  danh từ,  số nhiều ..." → take part before first comma
    const posRaw = line.replace(/^\*\s*/, "").split(",")[0].trim().toLowerCase();
    // Normalise: strip parentheses qualifiers like "(thuộc)"
    pos = posRaw.replace(/\(.*?\)/g, "").trim();
  } else if (line.startsWith("-") && word) {
    const def = line.replace(/^-\s*/, "").trim();
    if (def) defs.push(def);
  }
  // Lines starting with '=' (examples/idioms) and '!' are skipped
}
flushWord();

const total = Object.keys(dict).length;
fs.writeFileSync(OUTPUT, JSON.stringify(dict));
console.log(`✓ Parsed ${total.toLocaleString()} entries → dict.json (${(fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1)} MB)`);
