import React, { useState, useEffect, useMemo } from "react";
import { 
  BookOpen, 
  History, 
  BarChart3, 
  Download, 
  Plus, 
  Trash2, 
  Loader2, 
  Volume2,
  Flame,
  Shuffle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Word } from "./types";
import { lookupWord, getTTSUrl } from "./services/dictionaryService";
import { cn } from "./lib/utils";

function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readSavedAt(word: Word | (Word & { saved_at?: string })): string {
  return word.savedAt || (word as { saved_at?: string }).saved_at || new Date().toISOString();
}

function computeDayStreak(words: Word[]): number {
  if (!words.length) return 0;
  const daySet = new Set(words.map((w) => toLocalDateKey(readSavedAt(w))));
  const today = new Date();
  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (!daySet.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

// Renders definition string "(pos) 1. def; 2. def | (pos2) 1. def" as formatted lines
function DefinitionBlock({ definition, className }: { definition: string; className?: string }) {
  const groups = definition.split(" | ");
  return (
    <div className={cn("definition", className)}>
      {groups.map((group, gi) => {
        const match = group.match(/^\(([^)]+)\)\s*(.*)$/s);
        if (!match) return <p key={gi}>{group}</p>;
        const [, pos, rest] = match;
        const defs = rest.split(/;\s*(?=\d+\.)/).filter(Boolean);
        return (
          <div key={gi} className={gi > 0 ? "mt-1" : ""}>
            <span className="font-semibold text-primary">({pos})</span>
            {defs.map((d, di) => (
              <p key={di} className="ml-2">{d.trim()}</p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [flashWordId, setFlashWordId] = useState<string | null>(null);
  const [showFlashAnswer, setShowFlashAnswer] = useState(false);
  const [goal, setGoal] = useState(() => {
    const saved = localStorage.getItem("vocabvault.goal");
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
  });

  // Load from server on mount
  useEffect(() => {
    fetch("/api/words")
      .then(r => r.json())
      .then(data => setWords(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // No localStorage save needed - server handles persistence

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || isAdding) return;

    setIsAdding(true);
    setError(null);

    try {
      const result = await lookupWord(newWord);
      if (result) {
        await fetch("/api/words", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        });
        setWords([result, ...words]);
        setNewWord("");
      } else {
        setError("Word not found in the dictionary.");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = (id: string) => {
    fetch(`/api/words/${id}`, { method: "DELETE" }).catch(() => {});
    setWords(words.filter(w => w.id !== id));
    if (selectedWordId === id) setSelectedWordId(null);
  };

  const handlePlayTTS = (word: string) => {
    const audio = new Audio(getTTSUrl(word));
    audio.play();
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(words, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vocabvault_export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const imported = JSON.parse(text) as Word[];
      if (!Array.isArray(imported)) {
        setError("Invalid import file.");
        return;
      }

      const mergedMap = new Map<string, Word>();
      [...words, ...imported].forEach((w) => {
        if (!w?.word) return;
        const key = w.word.toLowerCase();
        const existing = mergedMap.get(key);
        if (!existing || new Date(readSavedAt(w)).getTime() > new Date(readSavedAt(existing)).getTime()) {
          mergedMap.set(key, {
            ...w,
            savedAt: readSavedAt(w),
            id: w.id || Date.now().toString(),
          });
        }
      });

      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(readSavedAt(b)).getTime() - new Date(readSavedAt(a)).getTime()
      );

      for (const w of merged) {
        await fetch("/api/words", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(w),
        });
      }

      setWords(merged);
      setError(null);
    } catch {
      setError("Import failed. Please use a valid JSON file.");
    }
  };

  useEffect(() => {
    if (!words.length) {
      setSelectedWordId(null);
      return;
    }
    if (!selectedWordId || !words.some((w) => w.id === selectedWordId)) {
      setSelectedWordId(words[0].id);
    }
  }, [words, selectedWordId]);

  useEffect(() => {
    if (!words.length) {
      setFlashWordId(null);
      setShowFlashAnswer(false);
      return;
    }
    if (!flashWordId || !words.some((w) => w.id === flashWordId)) {
      setFlashWordId(words[0].id);
      setShowFlashAnswer(false);
    }
  }, [words, flashWordId]);

  const pickRandomFlashWord = () => {
    if (!words.length) return;
    if (words.length === 1) {
      setFlashWordId(words[0].id);
      setShowFlashAnswer(false);
      return;
    }

    const candidates = flashWordId ? words.filter((w) => w.id !== flashWordId) : words;
    const random = candidates[Math.floor(Math.random() * candidates.length)];
    setFlashWordId(random.id);
    setShowFlashAnswer(false);
  };

  const handleSetGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(goalInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Goal must be a positive number.");
      return;
    }
    const nextGoal = Math.floor(parsed);
    setGoal(nextGoal);
    localStorage.setItem("vocabvault.goal", String(nextGoal));
    setGoalInput("");
    setError(null);
  };

  const featuredWord = useMemo(
    () => words.find((w) => w.id === selectedWordId) || words[0],
    [words, selectedWordId]
  );
  const flashWord = useMemo(
    () => words.find((w) => w.id === flashWordId) || words[0],
    [words, flashWordId]
  );

  const stats = useMemo(() => ({
    total: words.length,
    streak: computeDayStreak(words),
    goal
  }), [words, goal]);

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden p-6 max-w-[1200px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-primary font-extrabold text-2xl tracking-tight">
          <BookOpen className="w-8 h-8" />
          <span>VocabVault</span>
        </div>
        <div className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border border-green-200">
          <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
          Local EN-VI Dictionary (109k words)
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 md:grid-cols-4 grid-rows-auto md:grid-rows-[repeat(3,minmax(0,1fr))] gap-5 flex-grow min-h-0 md:overflow-hidden">
        
        {/* Featured Word Card */}
        <section className="card md:col-span-2 md:row-span-2 bg-linear-to-br from-white to-slate-50 overflow-hidden min-h-0">
          <span className="card-title">Latest Word</span>
          {featuredWord ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={featuredWord.id}
              className="flex flex-col h-full min-h-0 overflow-y-auto pr-1 custom-scrollbar"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="featured-word">{featuredWord.word}</h1>
                  <div className="ipa flex items-center gap-2">
                    {featuredWord.ipa}
                    <button 
                      onClick={() => handlePlayTTS(featuredWord.word)}
                      className="p-1 hover:bg-slate-100 rounded-full text-primary transition-colors"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold uppercase">
                  {featuredWord.pos}
                </span>
              </div>
              <DefinitionBlock definition={featuredWord.definition} />
              <div className="context-box">
                "{featuredWord.example}"
                <div className="text-primary text-xs mt-2 font-semibold">— Example from Dictionary</div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-sub opacity-50 italic">
              No words saved yet.
            </div>
          )}
        </section>

        {/* History Card */}
        <section className="card md:col-span-1 md:row-span-3 overflow-hidden min-h-0">
          <span className="card-title flex items-center gap-2">
            <History className="w-4 h-4" />
            Lookup History
          </span>
          <div className="flex-grow min-h-0 overflow-y-auto pr-2 custom-scrollbar overscroll-contain">
            <AnimatePresence initial={false}>
              {words.map((w) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={cn(
                    "history-item group flex justify-between items-start",
                    featuredWord?.id === w.id ? "bg-slate-50 rounded-md px-2" : ""
                  )}
                >
                  <div className="flex-grow cursor-pointer" onClick={() => setSelectedWordId(w.id)}>
                    <span className="font-semibold block text-sm">{w.word}</span>
                    <span className="text-xs text-text-sub line-clamp-1">{w.definition}</span>
                  </div>
                  <button
                    onClick={() => handlePlayTTS(w.word)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-primary transition-all"
                    title="Play pronunciation"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(w.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <button className="btn mt-4 w-full">View all {words.length} words</button>
        </section>

        {/* Stats 1: Vocabulary Count */}
        <section className="card">
          <span className="card-title flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Vocabulary
          </span>
          <div className="text-3xl font-bold text-primary">
            {stats.total} / {stats.goal}
          </div>
          <div className="h-1 bg-slate-100 rounded-full mt-4 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((stats.total / stats.goal) * 100, 100)}%` }}
              className="h-full bg-primary"
            />
          </div>
          <form onSubmit={handleSetGoal} className="mt-3 flex gap-2">
            <input
              type="number"
              min={1}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder={`Set goal (current ${stats.goal})`}
              className="w-full bg-slate-50 border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
            <button type="submit" className="btn btn-primary px-3 py-1.5 text-[11px]">
              Set
            </button>
          </form>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-orange-50 border border-orange-100 px-3 py-2">
            <div className="flex items-center gap-2 text-orange-700 text-xs font-semibold">
              <Flame className="w-4 h-4" />
              Day streak
            </div>
            <div className="text-sm font-bold text-orange-600">{stats.streak}</div>
          </div>
        </section>

        {/* Random Flash Card */}
        <section className="card md:row-span-2 overflow-hidden min-h-0">
          <span className="card-title flex items-center gap-2">
            <Shuffle className="w-4 h-4" />
            Random Flash Card
          </span>
          {flashWord ? (
            <div className="flex flex-col gap-3 min-h-0 flex-grow overflow-y-auto pr-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowFlashAnswer((v) => !v)}
                  className="btn"
                >
                  {showFlashAnswer ? "Hide Answer" : "Reveal Answer"}
                </button>
                <button
                  type="button"
                  onClick={pickRandomFlashWord}
                  className="btn btn-primary"
                >
                  Next Random
                </button>
              </div>
              <div className="text-xs text-text-sub">Try recalling the meaning before revealing.</div>
              <div className="rounded-xl border border-border bg-slate-50 px-4 py-5">
                <div className="text-2xl font-extrabold text-primary tracking-tight">{flashWord.word}</div>
                <div className="text-xs text-text-sub mt-1">{flashWord.ipa || "No IPA"}</div>
              </div>
              {showFlashAnswer ? (
                <DefinitionBlock definition={flashWord.definition} className="!text-sm !leading-6 mb-0" />
              ) : (
                <div className="text-xs text-text-sub italic">Meaning is hidden.</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-text-sub italic">Add words to start practicing.</div>
          )}
        </section>

        {/* Add Word Card */}
        <section className="card">
          <span className="card-title">Add Word</span>
          <form onSubmit={handleAddWord} className="flex flex-col gap-3">
            <div className="relative">
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Enter an English word..."
                className="w-full bg-slate-50 border border-border rounded-lg p-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
              {isAdding && (
                <div className="absolute right-2.5 top-2.5">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              )}
            </div>
            {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
            <button
              disabled={isAdding || !newWord.trim()}
              className="btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Save
            </button>
          </form>
        </section>

        {/* Export Card */}
        <section className="card bg-slate-900 text-white border-none">
          <span className="card-title text-slate-400">Export Data</span>
          <div className="text-sm mb-4 text-slate-300">Anki-ready format (JSON)</div>
          <button
            onClick={handleExport}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download .json
          </button>
          <label className="btn mt-2 w-full text-center cursor-pointer bg-slate-700 text-white hover:bg-slate-600">
            Import .json
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImport(file);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </section>

      </main>

      {/* Footer / Source Info */}
      <footer className="text-center text-text-sub text-[11px] opacity-50 py-4">
        VocabVault v1.1.0 • EN-VI Dictionary 109k words • Local Storage
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
}
