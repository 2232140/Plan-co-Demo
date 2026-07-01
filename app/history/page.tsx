"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Wifi, WifiOff, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { loadHistory } from "@/lib/history";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { HistoryEntry } from "@/types/planco";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function HistoryPage() {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory().then((data) => {
      setHistory(data);
      setLoading(false);
    });
  }, []);

  const clearLocalHistory = () => {
    try {
      localStorage.removeItem("planco_history");
      setHistory([]);
    } catch {}
  };

  return (
    <main
      className="min-h-screen pb-10"
      style={{ background: "linear-gradient(160deg, #FFB5A7 0%, #FEC89A 100%)" }}
    >
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center mb-6">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-full bg-white/30 hover:bg-white/50 transition-colors active:scale-95"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="flex-1 text-center pr-9">
            <h1 className="text-2xl font-extrabold text-white drop-shadow-md">Plan-co 🎢</h1>
          </div>
        </header>

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-extrabold text-xl drop-shadow-sm">
              履歴 📋
            </h2>
            <div className="flex items-center gap-1 mt-0.5">
              {isOnline ? (
                <>
                  <Wifi size={12} className="text-white/70" />
                  <span className="text-white/70 text-xs">オンライン保存</span>
                </>
              ) : (
                <>
                  <WifiOff size={12} className="text-white/70" />
                  <span className="text-white/70 text-xs">ローカル保存</span>
                </>
              )}
            </div>
          </div>
          {history.length > 0 && !isOnline && (
            <button
              onClick={clearLocalHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white/80 text-xs font-bold hover:bg-white/30 transition-colors active:scale-95"
            >
              <Trash2 size={12} />
              クリア
            </button>
          )}
        </div>

        {loading ? (
          <div className="bg-white/85 rounded-3xl p-10 shadow-2xl flex justify-center">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-orange-300 animate-dot-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white/85 backdrop-blur-sm rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-3 text-center">
            <Clock size={40} className="text-orange-200" />
            <p className="font-extrabold text-gray-500 text-lg">まだ履歴がありません</p>
            <p className="text-gray-400 text-sm">
              ルーレットで決定すると<br />ここに記録されます
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 shadow-lg"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full text-white ${
                        entry.type === "ai" ? "bg-purple-400" : "bg-orange-400"
                      }`}
                    >
                      {entry.type === "ai" ? "AI提案" : "カスタム"}
                    </span>
                    <span className="text-2xl font-extrabold text-gray-800">
                      {entry.selected_option}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-bold shrink-0 mt-1">
                    {formatDate(entry.created_at)}
                  </span>
                </div>

                {entry.type === "ai" && entry.conditions.location && entry.conditions.location !== "どこでも" && (
                  <p className="text-xs text-gray-400 mb-1">📍 {entry.conditions.location}</p>
                )}

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {entry.options.map((opt) => (
                    <span
                      key={opt}
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        opt === entry.selected_option
                          ? "bg-orange-100 text-orange-500"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
