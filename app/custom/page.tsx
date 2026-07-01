"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, AlertCircle } from "lucide-react";
import { Suggestion } from "@/types/planco";

const DEFAULT_ITEMS = ["", ""];

export default function CustomPage() {
  const router = useRouter();
  const [items, setItems] = useState<string[]>(DEFAULT_ITEMS);
  const [error, setError] = useState<string | null>(null);

  const updateItem = (index: number, value: string) => {
    setItems((prev) => prev.map((v, i) => (i === index ? value : v)));
  };

  const addItem = () => {
    if (items.length >= 10) return;
    setItems((prev) => [...prev, ""]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 2) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStart = () => {
    const filled = items.map((v) => v.trim()).filter(Boolean);
    if (filled.length < 2) {
      setError("2つ以上の選択肢を入力してください");
      return;
    }
    setError(null);

    const suggestions: Suggestion[] = filled.map((name, i) => ({
      id: String(i + 1),
      name: name.slice(0, 10),
      budget: "",
      description: "",
      reason: "",
    }));

    sessionStorage.setItem("planco_suggestions", JSON.stringify(suggestions));
    sessionStorage.setItem("planco_location", "どこでも");
    sessionStorage.setItem("planco_custom", "true");
    router.push("/roulette");
  };

  return (
    <main
      className="min-h-screen"
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

        <div className="mb-5">
          <h2 className="text-white font-extrabold text-xl drop-shadow-sm">
            自分でルーレットを作る 🎡
          </h2>
          <p className="text-white/80 text-sm mt-1">
            選択肢を2〜10個入力してルーレットを回そう！
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-100 text-red-600 rounded-2xl px-4 py-3 mb-4 text-sm font-bold">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-white/85 backdrop-blur-sm rounded-3xl p-6 shadow-2xl space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-400 font-extrabold text-sm shrink-0">
                {i + 1}
              </div>
              <input
                type="text"
                value={item}
                onChange={(e) => updateItem(i, e.target.value)}
                placeholder={`選択肢 ${i + 1}`}
                maxLength={10}
                className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-orange-100 bg-orange-50 text-gray-700 font-bold placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:border-orange-300 text-sm transition-colors"
              />
              {items.length > 2 && (
                <button
                  onClick={() => removeItem(i)}
                  className="p-2 rounded-full bg-red-50 text-red-300 hover:bg-red-100 hover:text-red-400 transition-colors active:scale-95"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}

          {items.length < 10 && (
            <button
              onClick={addItem}
              className="w-full py-2.5 rounded-2xl border-2 border-dashed border-orange-200 text-orange-300 font-bold text-sm hover:border-orange-300 hover:text-orange-400 transition-colors flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus size={16} />
              選択肢を追加（最大10個）
            </button>
          )}

          <div className="pt-2">
            <button
              onClick={handleStart}
              className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #FFB5A7 0%, #FEC89A 100%)" }}
            >
              ルーレットを回す！🎡
            </button>
          </div>
        </div>

        <p className="text-center text-white/60 text-xs mt-6">
          選択肢は10文字以内で入力してね
        </p>
      </div>
    </main>
  );
}
