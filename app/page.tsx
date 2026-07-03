"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import LoadingScreen from "@/components/loading-screen";

export default function LandingPage() {
  const router = useRouter();
  const [soloLoading, setSoloLoading] = useState(false);

  if (soloLoading) return <LoadingScreen message="読み込み中..." subMessage="🎢 少々お待ちください" />;

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(160deg, #FFB5A7 0%, #FEC89A 100%)" }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <div className="text-7xl mb-3 animate-swing inline-block">🎢</div>
        <h1 className="text-5xl font-extrabold text-white drop-shadow-lg tracking-wide">
          Plan-co
        </h1>
        <p className="text-white/90 text-sm mt-2 font-bold tracking-widest">
          今日の遊び、一緒に決めよう！
        </p>
      </motion.div>

      {/* Mode cards */}
      <div className="w-full max-w-sm space-y-4">
        {/* Solo */}
        <motion.button
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          onClick={() => { setSoloLoading(true); router.push("/solo"); }}
          className="w-full rounded-3xl p-6 text-left shadow-2xl active:scale-[0.97] transition-transform"
          style={{ background: "linear-gradient(135deg, #ffffff 0%, #fff0f0 100%)" }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-md"
              style={{ background: "linear-gradient(135deg, #FFB5A7 0%, #FEC89A 100%)" }}>
              🙋
            </div>
            <div>
              <p className="font-extrabold text-gray-800 text-xl">一人で使う</p>
              <p className="text-gray-400 text-sm mt-0.5">場所探し・1日プラン・AIチャット・ルーレット</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["📍 場所探す", "📅 1日プラン", "💬 AIチャット", "🎡 ルーレット"].map((t) => (
              <span key={t} className="px-2.5 py-1 bg-orange-50 text-orange-400 rounded-full text-xs font-bold">{t}</span>
            ))}
          </div>
        </motion.button>

        {/* Group */}
        <motion.button
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          onClick={() => router.push("/room/new")}
          className="w-full rounded-3xl p-6 text-left shadow-2xl active:scale-[0.97] transition-transform"
          style={{ background: "linear-gradient(135deg, #e8f4ff 0%, #f0e8ff 100%)" }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-md"
              style={{ background: "linear-gradient(135deg, #C7CEEA 0%, #B5EAD7 100%)" }}>
              👥
            </div>
            <div>
              <p className="font-extrabold text-gray-800 text-xl">みんなで使う</p>
              <p className="text-gray-400 text-sm mt-0.5">ルームを作って友達と一緒に決めよう</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["💬 投票", "❤️ リアクション", "🎡 同期ルーレット"].map((t) => (
              <span key={t} className="px-2.5 py-1 bg-blue-50 text-blue-400 rounded-full text-xs font-bold">{t}</span>
            ))}
          </div>
        </motion.button>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="text-white/50 text-xs mt-10"
      >
        Plan-co — 楽しい予定はもっとスムーズに
      </motion.p>
    </main>
  );
}
