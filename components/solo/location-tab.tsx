"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Wallet, Sparkles, MapPin, AlertCircle, PenLine, LocateFixed, Loader2 } from "lucide-react";
import LoadingScreen from "@/components/loading-screen";
import { Suggestion } from "@/types/planco";

const PEOPLE_OPTIONS = ["1人", "2人", "3〜4人", "5人以上"];
const BUDGET_OPTIONS = ["〜1,000円", "〜3,000円", "〜5,000円", "〜10,000円", "上限なし"];
const THEME_OPTIONS = [
  { value: "グルメ",       emoji: "🍔" },
  { value: "まったりカフェ", emoji: "☕" },
  { value: "アクティブ",   emoji: "🏃" },
  { value: "アート・文化", emoji: "🎨" },
  { value: "屋内でゆっくり", emoji: "🏠" },
  { value: "ショッピング", emoji: "🛍️" },
];
const QUICK_AREAS = ["渋谷", "新宿", "梅田", "難波", "名古屋", "横浜", "札幌", "博多"];

export default function LocationTab() {
  const router = useRouter();
  const [people, setPeople]     = useState("2人");
  const [budget, setBudget]     = useState("〜3,000円");
  const [themes, setThemes]     = useState<string[]>([]);
  const [freeTheme, setFreeTheme] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords]     = useState<{ lat: number; lon: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const toggleTheme = (v: string) =>
    setThemes((p) => (p.includes(v) ? p.filter((t) => t !== v) : [...p, v]));

  const handleGetLocation = () => {
    if (!navigator.geolocation) { setError("位置情報に対応していません"); return; }
    setGeoLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setLocation("現在地"); setGeoLoading(false); },
      () => { setError("位置情報の取得に失敗しました"); setGeoLoading(false); },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peopleCount: people, budget,
          theme: [...themes, freeTheme.trim()].filter(Boolean).join("・") || "なんでも",
          location: location.trim() || "どこでも",
          lat: coords?.lat, lon: coords?.lon,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "提案の取得に失敗しました"); }
      const data = await res.json() as { suggestions: Suggestion[] };
      sessionStorage.setItem("planco_suggestions", JSON.stringify(data.suggestions));
      sessionStorage.setItem("planco_location", location.trim() || "どこでも");
      router.push("/suggestions");
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  const loadingMsg = coords ? "現在地の天気を考慮して\n最適なプランを探索中" : "Plan-coが楽しい予定を考え中";
  const loadingSub = coords ? "🌤️ 天気・気温・風速を確認しています..." : "🎢 少々お待ちください";

  return (
    <>
      {isLoading && <LoadingScreen message={loadingMsg} subMessage={loadingSub} />}
      <div className="px-4 py-5 space-y-5">
        {error && (
          <div className="flex items-center gap-2 bg-red-100 text-red-600 rounded-2xl px-4 py-3 text-sm font-bold">
            <AlertCircle size={16} className="shrink-0" />{error}
          </div>
        )}

        <div className="bg-white/85 backdrop-blur-sm rounded-3xl p-5 shadow-xl space-y-6">
          {/* Location */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-rose-400" />
              <span className="font-extrabold text-gray-700 text-sm">どこで遊ぶ？<span className="text-gray-400 font-normal ml-1">（任意）</span></span>
            </div>
            <input type="text" value={location}
              onChange={(e) => { setLocation(e.target.value); if (e.target.value !== "現在地") setCoords(null); }}
              placeholder="例：渋谷、新宿、梅田..."
              className="w-full px-4 py-2.5 rounded-2xl border-2 border-rose-100 bg-rose-50 text-gray-700 font-bold placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:border-rose-300 text-sm"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button onClick={handleGetLocation} disabled={geoLoading}
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-60 ${coords ? "bg-emerald-400 text-white scale-105" : "bg-emerald-50 text-emerald-500"}`}>
                {geoLoading ? <Loader2 size={11} className="animate-spin" /> : <LocateFixed size={11} />}
                現在地を使用
              </button>
              {QUICK_AREAS.map((a) => (
                <button key={a} onClick={() => { setLocation(a); setCoords(null); }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${location === a ? "bg-rose-400 text-white scale-105" : "bg-rose-50 text-rose-400 active:scale-95"}`}>
                  {a}
                </button>
              ))}
            </div>
            {coords && <p className="text-xs text-emerald-500 font-bold mt-1.5 flex items-center gap-1"><LocateFixed size={11} />現在地を取得。天気も考慮したプランを提案します！</p>}
          </section>

          {/* People */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-orange-400" />
              <span className="font-extrabold text-gray-700 text-sm">一緒に行く人数</span>
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
              <Wallet size={16} className="text-yellow-500" />
              <span className="font-extrabold text-gray-700 text-sm">予算（1人あたり）</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
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
              <Sparkles size={16} className="text-purple-400" />
              <span className="font-extrabold text-gray-700 text-sm">テーマ<span className="text-gray-400 font-normal ml-1">（複数可）</span></span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => toggleTheme(opt.value)}
                  className={`flex flex-col items-center py-2.5 rounded-2xl text-xs font-bold transition-all ${themes.includes(opt.value) ? "bg-purple-400 text-white shadow-md scale-105" : "bg-purple-50 text-purple-600 active:scale-95"}`}>
                  <span className="text-lg">{opt.emoji}</span>
                  <span className="mt-0.5">{opt.value}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <PenLine size={14} className="text-purple-300 shrink-0" />
              <input type="text" value={freeTheme} onChange={(e) => setFreeTheme(e.target.value)}
                placeholder="自由に入力（例：デート）"
                className="w-full px-4 py-2 rounded-2xl border-2 border-purple-100 bg-purple-50 text-gray-700 font-bold placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:border-purple-300 text-sm" />
            </div>
          </section>

          <button onClick={handleSubmit} disabled={isLoading}
            className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg transition-all active:scale-95 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #FFB5A7 0%, #FEC89A 100%)" }}>
            プランを決める！✨
          </button>
        </div>
      </div>
    </>
  );
}
