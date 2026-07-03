"use client";

import { useState } from "react";
import { MapPin, Users, Wallet, Sparkles, Clock, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { DayPlan } from "@/app/api/suggest-day-plan/route";

const PEOPLE_OPTIONS = ["1人", "2人", "3〜4人", "5人以上"];
const BUDGET_OPTIONS = ["〜3,000円", "〜5,000円", "〜10,000円", "上限なし"];
const DEPARTURE_OPTIONS = ["9:00", "10:00", "11:00", "12:00", "13:00"];
const THEME_OPTIONS = [
  { value: "グルメ巡り",  emoji: "🍽️" },
  { value: "カフェ",     emoji: "☕" },
  { value: "アクティブ", emoji: "🏃" },
  { value: "アート",     emoji: "🎨" },
  { value: "のんびり",   emoji: "😌" },
  { value: "ショッピング", emoji: "🛍️" },
];
const SLOT_COLORS = ["#FFB5A7", "#B5EAD7", "#C7CEEA"];
const SLOT_BG    = ["bg-rose-50", "bg-emerald-50", "bg-purple-50"];
const SLOT_TEXT  = ["text-rose-500", "text-emerald-500", "text-purple-500"];

export default function DayPlanTab() {
  const [location, setLocation]       = useState("");
  const [people, setPeople]           = useState("2人");
  const [budget, setBudget]           = useState("〜5,000円");
  const [theme, setTheme]             = useState("");
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [departure, setDeparture]     = useState("10:00");
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [plan, setPlan]               = useState<DayPlan | null>(null);

  const toggleTheme = (v: string) =>
    setSelectedThemes((p) => p.includes(v) ? p.filter((t) => t !== v) : [...p, v]);

  const handleGenerate = async () => {
    setError(null);
    setIsLoading(true);
    setPlan(null);
    try {
      const themeStr = [...selectedThemes, theme.trim()].filter(Boolean).join("・") || "なんでも";
      const res = await fetch("/api/suggest-day-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: location.trim() || "どこでも", people, budget, theme: themeStr, departureTime: departure }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "生成に失敗しました"); }
      const data = await res.json() as { plan: DayPlan };
      setPlan(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-4 py-5 space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-100 text-red-600 rounded-2xl px-4 py-3 text-sm font-bold">
          <AlertCircle size={16} className="shrink-0" />{error}
        </div>
      )}

      {/* Result */}
      {plan && (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-white/70 text-xs font-bold">📅 1日プラン</p>
            <h2 className="text-white font-extrabold text-xl drop-shadow-sm">{plan.title}</h2>
            <p className="text-white/80 text-sm font-bold mt-0.5">総予算目安: {plan.totalBudget}</p>
          </div>

          {plan.timeline.map((slot, i) => (
            <div key={i} className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0"
                  style={{ backgroundColor: SLOT_COLORS[i] }}>
                  {["朝", "昼", "夜"][i]}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${SLOT_TEXT[i]}`}>{slot.timeSlot}</p>
                  <p className="font-extrabold text-gray-800 text-base leading-tight">{slot.spotName}</p>
                </div>
                <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${SLOT_BG[i]} ${SLOT_TEXT[i]}`}>
                  {slot.duration}
                </span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed pl-1">{slot.description}</p>
            </div>
          ))}

          <button onClick={() => setPlan(null)}
            className="w-full py-3 rounded-2xl font-bold text-white/80 bg-white/20 hover:bg-white/30 transition-all text-sm flex items-center justify-center gap-2 active:scale-95">
            <RotateCcw size={14} />もう一度作る
          </button>
        </div>
      )}

      {/* Form */}
      {!plan && (
        <div className="bg-white/85 backdrop-blur-sm rounded-3xl p-5 shadow-xl space-y-5">
          {/* Location */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={15} className="text-rose-400" />
              <span className="font-extrabold text-gray-700 text-sm">エリア<span className="text-gray-400 font-normal ml-1">（任意）</span></span>
            </div>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="例：渋谷、横浜..."
              className="w-full px-4 py-2.5 rounded-2xl border-2 border-rose-100 bg-rose-50 text-gray-700 font-bold placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:border-rose-300 text-sm" />
          </section>

          {/* Departure */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={15} className="text-blue-400" />
              <span className="font-extrabold text-gray-700 text-sm">出発時間</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {DEPARTURE_OPTIONS.map((v) => (
                <button key={v} onClick={() => setDeparture(v)}
                  className={`px-3 py-1.5 rounded-2xl text-sm font-bold transition-all ${departure === v ? "bg-blue-400 text-white shadow-md scale-105" : "bg-blue-50 text-blue-500 active:scale-95"}`}>
                  {v}
                </button>
              ))}
            </div>
          </section>

          {/* People */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Users size={15} className="text-orange-400" />
              <span className="font-extrabold text-gray-700 text-sm">人数</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {PEOPLE_OPTIONS.map((v) => (
                <button key={v} onClick={() => setPeople(v)}
                  className={`py-2 rounded-2xl text-sm font-bold transition-all ${people === v ? "bg-orange-400 text-white shadow-md scale-105" : "bg-orange-50 text-orange-400 active:scale-95"}`}>
                  {v}
                </button>
              ))}
            </div>
          </section>

          {/* Budget */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={15} className="text-yellow-500" />
              <span className="font-extrabold text-gray-700 text-sm">予算（1人・1日合計）</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {BUDGET_OPTIONS.map((v) => (
                <button key={v} onClick={() => setBudget(v)}
                  className={`py-2 rounded-2xl text-sm font-bold transition-all ${budget === v ? "bg-yellow-400 text-white shadow-md scale-105" : "bg-yellow-50 text-yellow-600 active:scale-95"}`}>
                  {v}
                </button>
              ))}
            </div>
          </section>

          {/* Theme */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={15} className="text-purple-400" />
              <span className="font-extrabold text-gray-700 text-sm">テーマ<span className="text-gray-400 font-normal ml-1">（任意）</span></span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {THEME_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => toggleTheme(opt.value)}
                  className={`flex items-center justify-center gap-1 py-2 rounded-2xl text-xs font-bold transition-all ${selectedThemes.includes(opt.value) ? "bg-purple-400 text-white shadow-md scale-105" : "bg-purple-50 text-purple-600 active:scale-95"}`}>
                  <span>{opt.emoji}</span><span>{opt.value}</span>
                </button>
              ))}
            </div>
            <input type="text" value={theme} onChange={(e) => setTheme(e.target.value)}
              placeholder="自由入力（例：朝活・カップル）"
              className="w-full px-4 py-2 rounded-2xl border-2 border-purple-100 bg-purple-50 text-gray-700 font-bold placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:border-purple-300 text-sm" />
          </section>

          <button onClick={handleGenerate} disabled={isLoading}
            className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #FFB5A7 0%, #FEC89A 100%)" }}>
            {isLoading ? <><Loader2 size={20} className="animate-spin" />作成中...</> : "1日プランを作成 ✨"}
          </button>
        </div>
      )}
    </div>
  );
}
