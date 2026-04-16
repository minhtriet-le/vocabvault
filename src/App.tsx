import React, { useState, useEffect, useMemo } from "react";
import { 
  BookOpen, 
  History, 
  BarChart3, 
  Server, 
  Download, 
  Plus, 
  Trash2, 
  Loader2, 
  Volume2,
  Flame,
  CheckCircle2,
  Puzzle,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Word } from "./types";
import { lookupWord, getTTSUrl } from "./services/dictionaryService";
import { cn } from "./lib/utils";

export default function App() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError("Không tìm thấy từ này trong từ điển.");
      }
    } catch (err) {
      setError("Lỗi kết nối API. Vui lòng thử lại.");
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = (id: string) => {
    fetch(`/api/words/${id}`, { method: "DELETE" }).catch(() => {});
    setWords(words.filter(w => w.id !== id));
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

  const featuredWord = useMemo(() => words[0], [words]);
  const stats = useMemo(() => ({
    total: words.length,
    streak: 12,
    goal: 1000
  }), [words]);

  return (
    <div className="min-h-screen p-6 max-w-[1200px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-primary font-extrabold text-2xl tracking-tight">
          <BookOpen className="w-8 h-8" />
          <span>VocabVault</span>
        </div>
        <div className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border border-green-200">
          <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
          API: dict.minhqnd.com (Online)
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 md:grid-cols-4 grid-rows-auto md:grid-rows-3 gap-5 flex-grow">
        
        {/* Featured Word Card */}
        <section className="card md:col-span-2 md:row-span-2 bg-linear-to-br from-white to-slate-50">
          <span className="card-title">Từ vựng mới nhất</span>
          {featuredWord ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={featuredWord.id}
              className="flex flex-col h-full"
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
              <p className="definition">{featuredWord.definition}</p>
              <div className="context-box">
                "{featuredWord.example}"
                <div className="text-primary text-xs mt-2 font-semibold">— Example from Dictionary</div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-sub opacity-50 italic">
              Chưa có từ vựng nào được lưu.
            </div>
          )}
        </section>

        {/* History Card */}
        <section className="card md:col-span-1 md:row-span-3 overflow-hidden">
          <span className="card-title flex items-center gap-2">
            <History className="w-4 h-4" />
            Lịch sử tra cứu
          </span>
          <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence initial={false}>
              {words.map((w) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="history-item group flex justify-between items-start"
                >
                  <div className="flex-grow cursor-pointer" onClick={() => handlePlayTTS(w.word)}>
                    <span className="font-semibold block text-sm">{w.word}</span>
                    <span className="text-xs text-text-sub line-clamp-1">{w.definition}</span>
                  </div>
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
          <button className="btn mt-4 w-full">Xem tất cả {words.length} từ</button>
        </section>

        {/* Stats 1: Vocabulary Count */}
        <section className="card">
          <span className="card-title flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Kho từ vựng
          </span>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Từ đã lưu</div>
          <div className="h-1 bg-slate-100 rounded-full mt-4 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((stats.total / stats.goal) * 100, 100)}%` }}
              className="h-full bg-primary"
            />
          </div>
          <div className="stat-label text-[11px] mt-2">Mục tiêu: {stats.goal} từ</div>
        </section>

        {/* Stats 2: Streak */}
        <section className="card">
          <span className="card-title flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Học tập
          </span>
          <div className="stat-value">{stats.streak}</div>
          <div className="stat-label">Ngày học liên tiếp</div>
          <div className="mt-auto text-accent-green text-xs font-bold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            Tuyệt vời!
          </div>
        </section>

        {/* Add Word Card */}
        <section className="card">
          <span className="card-title">Thêm từ mới</span>
          <form onSubmit={handleAddWord} className="flex flex-col gap-3">
            <div className="relative">
              <input 
                type="text" 
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Nhập từ tiếng Anh..."
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
              Lưu từ
            </button>
          </form>
        </section>

        {/* Extension Info */}
        <section className="card">
          <span className="card-title flex items-center gap-2">
            <Puzzle className="w-4 h-4" />
            Chrome Extension
          </span>
          <div className="flex flex-col gap-2">
            <div className="text-xs text-text-sub">
              Bôi đen từ trên web để lưu ngay vào kho từ vựng.
            </div>
            <div className="bg-slate-900 text-slate-300 p-2 rounded-md text-[10px] font-mono">
              /extension folder
            </div>
          </div>
          <button className="btn mt-auto flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Tải Extension
          </button>
        </section>

        {/* Export Card */}
        <section className="card bg-slate-900 text-white border-none md:col-span-1">
          <span className="card-title text-slate-400">Xuất dữ liệu</span>
          <div className="text-sm mb-4">Định dạng sẵn sàng cho Anki (JSON)</div>
          <button 
            onClick={handleExport}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Tải xuống .json
          </button>
        </section>

      </main>

      {/* Footer / Source Info */}
      <footer className="text-center text-text-sub text-[11px] opacity-50 py-4">
        VocabVault v1.1.0 • API: dict.minhqnd.com • Pure Client-side Storage
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
