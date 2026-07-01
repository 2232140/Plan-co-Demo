"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import RouletteWheel from "@/components/roulette-wheel";

const DUMMY_ITEMS = ["カラオケ", "おしゃれカフェ", "公園でボート", "映画鑑賞", "猫カフェ"];

const CONFETTI_EMOJIS = ["🎉", "✨", "🎊", "⭐", "🌟", "💫"];

interface Particle {
  id: number;
  emoji: string;
  x: number;
  delay: number;
}

function ConfettiParticles({ show }: { show: boolean }) {
  if (!show) return null;
  const particles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length],
    x: 10 + Math.round(i * 7.5),
    delay: (i % 4) * 0.15,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute text-2xl animate-float-up"
          style={{
            left: `${p.x}%`,
            bottom: "30%",
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

export default function RoulettePage() {
  const router = useRouter();
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState<"roulette" | "amida">("roulette");
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSpin = () => {
    if (isSpinning) return;
    setResult(null);
    setShowConfetti(false);
    setIsSpinning(true);
    setSpinTrigger((t) => t + 1);
  };

  const handleComplete = useCallback((item: string) => {
    setResult(item);
    setIsSpinning(false);
    setShowConfetti(true);
    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    confettiTimerRef.current = setTimeout(() => setShowConfetti(false), 2200);
  }, []);

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
          <h1 className="flex-1 text-center text-2xl font-extrabold text-white drop-shadow-md pr-9">
            Plan-co 🎢
          </h1>
        </header>

        {/* Tabs */}
        <div className="bg-white/25 rounded-2xl p-1 flex mb-6">
          <button
            onClick={() => setActiveTab("roulette")}
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === "roulette"
                ? "bg-white text-orange-400 shadow-md"
                : "text-white/80 hover:text-white"
            }`}
          >
            🎡 ルーレット
          </button>
          <button
            onClick={() => setActiveTab("amida")}
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === "amida"
                ? "bg-white text-orange-400 shadow-md"
                : "text-white/80 hover:text-white"
            }`}
          >
            🪜 あみだくじ
          </button>
        </div>

        {activeTab === "roulette" ? (
          <div className="space-y-5">
            {/* Wheel card */}
            <div className="relative bg-white/85 backdrop-blur-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center overflow-hidden">
              <ConfettiParticles show={showConfetti} />
              <RouletteWheel
                items={DUMMY_ITEMS}
                spinTrigger={spinTrigger}
                onComplete={handleComplete}
              />

              {/* Result */}
              {result && (
                <div className="mt-5 text-center animate-pop-in">
                  <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">
                    決まりました！
                  </p>
                  <p className="text-3xl font-extrabold text-orange-500 mt-1">
                    {result} 🎉
                  </p>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleSpin}
                disabled={isSpinning}
                className={`w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                  isSpinning
                    ? "opacity-70 cursor-not-allowed"
                    : "active:scale-95"
                }`}
                style={{ background: "linear-gradient(135deg, #FFB5A7 0%, #FEC89A 100%)" }}
              >
                {isSpinning
                  ? "🌀 回転中..."
                  : result
                  ? "🔄 もう一度回す"
                  : "🎡 START"}
              </button>

              {result && !isSpinning && (
                <button className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-500">
                  <CheckCircle2 size={22} />
                  ここに決定！
                </button>
              )}
            </div>
          </div>
        ) : (
          /* あみだくじ placeholder */
          <div className="bg-white/85 backdrop-blur-sm rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-3">
            <span className="text-5xl">🪜</span>
            <p className="font-extrabold text-gray-600 text-xl">あみだくじ</p>
            <p className="text-gray-400 text-sm text-center leading-relaxed">
              近日公開予定！<br />スプリント3でお楽しみに✨
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
